import crypto from 'crypto';
import { supabaseAdmin, isSupabaseAdminReady } from '../src/config/supabaseAdmin.js';

const HOD_EMAIL = process.env.HOD_EMAIL || 'hod.aiml@mictech.ac.in';
const HOD_NAME = 'Dr. Thatibalamuralikrishna';
const HOD_PASSWORD = process.env.HOD_INITIAL_PASSWORD || ('MicAiml#' + crypto.randomBytes(4).toString('hex') + '!');

async function bootstrapHOD() {
  console.log('================================================================');
  console.log(' AIML DEPARTMENT HOD ACCOUNT PROVISIONING');
  console.log(` Target Identity: ${HOD_NAME}`);
  console.log(` Target Email:    ${HOD_EMAIL}`);
  console.log('================================================================');

  if (!isSupabaseAdminReady()) {
    console.error('[ERROR] Supabase Admin client is not configured or ready.');
    process.exit(1);
  }

  try {
    // 1. Check if user already exists in auth.users by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('[ERROR] Failed to list auth users:', listError.message);
      process.exit(1);
    }

    let hodUser = (usersData.users || []).find(u => u.email?.toLowerCase() === HOD_EMAIL.toLowerCase());

    if (!hodUser) {
      console.log(`[INFO] Provisioning fresh Supabase Auth account for ${HOD_EMAIL}...`);
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: HOD_EMAIL,
        password: HOD_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: HOD_NAME,
          role: 'hod',
          title: 'Professor & Head of Department',
          department: 'Department of Artificial Intelligence and Machine Learning'
        }
      });

      if (createError || !createData?.user) {
        console.error('[ERROR] Failed to create HOD Auth account:', createError?.message);
        process.exit(1);
      }
      hodUser = createData.user;
      console.log(`[SUCCESS] Supabase Auth account created (ID: ${hodUser.id}).`);
    } else {
      console.log(`[INFO] Existing Auth account identified (ID: ${hodUser.id}).`);
    }

    // 2. Ensure HOD role mapping in aiml_user_roles
    const { data: roleRecord, error: roleError } = await supabaseAdmin
      .from('aiml_user_roles')
      .select('role')
      .eq('user_id', hodUser.id)
      .maybeSingle();

    if (roleError) {
      console.error('[ERROR] Error checking aiml_user_roles:', roleError.message);
      process.exit(1);
    }

    if (!roleRecord) {
      console.log('[INFO] Assigning HOD role in public.aiml_user_roles...');
      const { error: insertRoleError } = await supabaseAdmin
        .from('aiml_user_roles')
        .insert({
          user_id: hodUser.id,
          role: 'hod',
          created_at: new Date().toISOString()
        });

      if (insertRoleError) {
        console.error('[ERROR] Failed to assign HOD role in aiml_user_roles:', insertRoleError.message);
        process.exit(1);
      }
      console.log('[SUCCESS] HOD role assigned in public.aiml_user_roles.');
    } else {
      console.log(`[INFO] HOD role is already active in public.aiml_user_roles (Role: ${roleRecord.role}).`);
    }

    // 3. Record audit log
    await supabaseAdmin
      .from('aiml_audit_logs')
      .insert({
        actor_user_id: hodUser.id,
        action: 'BOOTSTRAP_HOD_ACCOUNT',
        entity_name: 'aiml_user_roles',
        entity_id: hodUser.id,
        metadata: {
          email: HOD_EMAIL,
          name: HOD_NAME,
          role: 'hod'
        },
        created_at: new Date().toISOString()
      });

    console.log('================================================================');
    console.log(' HOD BOOTSTRAP COMPLETE');
    console.log(` Official Name:     ${HOD_NAME}`);
    console.log(` Login Email:       ${HOD_EMAIL}`);
    console.log(` Initial Password:  ${HOD_PASSWORD}`);
    console.log(' NOTE: Please change this initial password upon first login.');
    console.log('================================================================');
  } catch (err) {
    console.error('[FATAL] Unexpected error during HOD bootstrap:', err.message);
    process.exit(1);
  }
}

bootstrapHOD();
