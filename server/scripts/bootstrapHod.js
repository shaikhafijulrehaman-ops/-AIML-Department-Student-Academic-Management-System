import readline from 'readline';
import { supabaseAdmin, isSupabaseAdminReady } from '../src/config/supabaseAdmin.js';

const HOD_EMAIL = process.env.HOD_EMAIL || 'hod.aiml@mictech.ac.in';
const HOD_NAME = 'Dr. Thatibalamuralikrishna';

/**
 * Securely prompts for password from stdin without echoing characters to terminal.
 */
function promptPasswordHidden(promptText = 'Enter HOD Password: ') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const stdin = process.stdin;
    process.stdout.write(promptText);

    let password = '';

    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      const onData = (ch) => {
        const c = ch.toString();
        if (c === '\n' || c === '\r' || c === '\u0004') {
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          rl.close();
          process.stdout.write('\n');
          resolve(password);
        } else if (c === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write('\n[ABORTED] Operation cancelled by user.\n');
          process.exit(1);
        } else if (c === '\b' || c === '\x7f') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += c;
        }
      };

      stdin.on('data', onData);
    } else {
      // Non-interactive / piped fallback
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function bootstrapHOD() {
  console.log('================================================================');
  console.log(' AIML DEPARTMENT HOD ACCOUNT PROVISIONING & VERIFICATION');
  console.log(` Target Identity: ${HOD_NAME}`);
  console.log(` Target Email:    ${HOD_EMAIL}`);
  console.log('================================================================');

  if (!isSupabaseAdminReady()) {
    console.error('[ERROR] Supabase Admin client is not configured or ready.');
    process.exit(1);
  }

  // 1. Interactive hidden password entry
  const password = await promptPasswordHidden('Enter HOD secure password (min 8 chars): ');

  if (!password || password.length < 8) {
    console.error('[ERROR] Password must be at least 8 characters in length.');
    process.exit(1);
  }

  const confirmPassword = await promptPasswordHidden('Confirm HOD password: ');
  if (password !== confirmPassword) {
    console.error('[ERROR] Passwords do not match. Aborting.');
    process.exit(1);
  }

  try {
    console.log('\n[INFO] Connecting to Supabase Auth to verify existing accounts...');

    // 2. Check if user already exists in auth.users by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('[ERROR] Failed to query auth users:', listError.message);
      process.exit(1);
    }

    let hodUser = (usersData?.users || []).find(
      (u) => u.email?.toLowerCase() === HOD_EMAIL.toLowerCase()
    );

    if (!hodUser) {
      console.log(`[INFO] Provisioning fresh Supabase Auth account for ${HOD_EMAIL}...`);
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: HOD_EMAIL,
        password: password,
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
      console.log(`[SUCCESS] Supabase Auth account provisioned.`);
    } else {
      console.log(`[INFO] Existing Auth account identified. Updating password...`);
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        hodUser.id,
        {
          password: password,
          email_confirm: true,
          user_metadata: {
            ...hodUser.user_metadata,
            name: HOD_NAME,
            role: 'hod'
          }
        }
      );

      if (updateError || !updateData?.user) {
        console.error('[ERROR] Failed to update existing HOD Auth credentials:', updateError?.message);
        process.exit(1);
      }
      hodUser = updateData.user;
      console.log(`[SUCCESS] Supabase Auth credentials successfully updated.`);
    }

    // 3. Ensure HOD role mapping in aiml_user_roles
    console.log('[INFO] Verifying administrative role in public.aiml_user_roles...');
    const { data: roleRecord, error: roleError } = await supabaseAdmin
      .from('aiml_user_roles')
      .select('id, user_id, role, is_active')
      .eq('user_id', hodUser.id)
      .maybeSingle();

    if (roleError) {
      if (roleError.message?.includes('schema cache') || roleError.message?.includes('does not exist')) {
        console.warn('\n[WARNING] Table public.aiml_user_roles not found in database schema.');
        console.warn('Please apply database/migrations/001_aiml_department_schema.sql in the Supabase SQL Editor.');
        console.warn('The Supabase Auth account has been secured, but role assignment requires schema migration.');
        process.exit(1);
      }
      console.error('[ERROR] Error verifying aiml_user_roles:', roleError.message);
      process.exit(1);
    }

    if (!roleRecord) {
      console.log('[INFO] Assigning HOD role in public.aiml_user_roles...');
      const { data: newRole, error: insertRoleError } = await supabaseAdmin
        .from('aiml_user_roles')
        .insert({
          user_id: hodUser.id,
          role: 'hod',
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertRoleError) {
        console.error('[ERROR] Failed to assign HOD role in aiml_user_roles:', insertRoleError.message);
        process.exit(1);
      }
      console.log('[SUCCESS] HOD administrative role assigned.');
    } else {
      if (!roleRecord.is_active || roleRecord.role !== 'hod') {
        const { error: updateRoleError } = await supabaseAdmin
          .from('aiml_user_roles')
          .update({ role: 'hod', is_active: true })
          .eq('user_id', hodUser.id);

        if (updateRoleError) {
          console.error('[ERROR] Failed to update HOD role record:', updateRoleError.message);
          process.exit(1);
        }
        console.log('[SUCCESS] Reactivated and set HOD role in aiml_user_roles.');
      } else {
        console.log('[SUCCESS] HOD role is already active in public.aiml_user_roles.');
      }
    }

    // 4. Audit log entry
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
      })
      .catch(() => {});

    console.log('\n================================================================');
    console.log(' HOD PROVISIONING & VERIFICATION COMPLETE');
    console.log(` Official Name:  ${HOD_NAME}`);
    console.log(` Login Email:    ${HOD_EMAIL}`);
    console.log(` Role Status:    VERIFIED ACTIVE ('hod')`);
    console.log(' Password:       [SECURELY CONFIGURED - NEVER LOGGED]');
    console.log('================================================================');
  } catch (err) {
    console.error('[FATAL] Unexpected error during HOD bootstrap:', err.message);
    process.exit(1);
  }
}

bootstrapHOD();
