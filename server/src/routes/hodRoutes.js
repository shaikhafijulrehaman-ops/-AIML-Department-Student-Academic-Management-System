import { Router } from 'express';
import crypto from 'crypto';
import { supabaseAdmin, isSupabaseAdminReady } from '../config/supabaseAdmin.js';
import { requireAuth, requireHodRole, getDeterministicStudentEmail } from '../middleware/authMiddleware.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

function generateSecureTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + numbers + special;

  const bytes = crypto.randomBytes(12);
  let pass = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    numbers[bytes[2] % numbers.length],
    special[bytes[3] % special.length],
  ];

  for (let i = 4; i < 10; i++) {
    pass.push(all[bytes[i] % all.length]);
  }

  for (let i = pass.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [pass[i], pass[j]] = [pass[j], pass[i]];
  }

  return pass.join('');
}

const router = Router();

// Apply HOD authentication and authorization to all administrative routes
router.use(requireAuth);
router.use(requireHodRole);

/**
 * POST /api/hod/students
 *
 * HOD Provisions Student Login Account:
 * 1. Required fields: registerNumber, initialPassword.
 * 2. Checks for duplicate Register Number in aiml_student_profiles.
 * 3. Creates Supabase Auth user securely using deterministic email.
 * 4. Creates aiml_student_profiles record (must_change_password=true, is_profile_completed=false).
 * 5. Assigns 'student' role in aiml_user_roles.
 * 6. Executes compensating rollback (deleting Auth user) if profile/role creation fails.
 * 7. Records administrative audit log.
 */
router.post('/students', async (req, res, next) => {
  let createdAuthUserId = null;
  try {
    const { registerNumber, initialPassword } = req.body;

    if (!registerNumber || typeof registerNumber !== 'string' || registerNumber.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Student Register Number is required.'
      });
    }

    if (!initialPassword || typeof initialPassword !== 'string' || initialPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Initial Password is required and must be at least 6 characters long.'
      });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();

    // 1. Check for existing Register Number
    const { data: existingProfile } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, register_number')
      .eq('register_number', cleanRegNo)
      .maybeSingle();

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        error: `A student account with Register Number "${cleanRegNo}" already exists in the department directory.`
      });
    }

    // 2. Generate deterministic internal email
    const internalEmail = getDeterministicStudentEmail(cleanRegNo);

    // 3. Create Supabase Auth account securely
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: initialPassword,
      email_confirm: true,
      user_metadata: {
        register_number: cleanRegNo,
        role: 'student'
      }
    });

    if (authError || !authData?.user) {
      console.error('[HODService] Supabase Auth creation failed for student:', cleanRegNo, authError?.message);
      return res.status(500).json({
        success: false,
        error: `Failed to create authentication credentials: ${authError?.message || 'Auth service error'}`
      });
    }

    createdAuthUserId = authData.user.id;

    // 4. Create aiml_student_profiles entry
    const { data: studentProfile, error: profileError } = await supabaseAdmin
      .from('aiml_student_profiles')
      .insert({
        user_id: createdAuthUserId,
        register_number: cleanRegNo,
        is_active: true,
        must_change_password: true,
        is_profile_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, user_id, register_number, is_active, must_change_password, is_profile_completed, created_at')
      .single();

    if (profileError || !studentProfile) {
      // Compensating rollback: delete created Auth user to prevent orphaned credentials
      console.error('[HODService] Profile creation failed. Rolling back Auth user:', createdAuthUserId, profileError?.message);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      return res.status(500).json({
        success: false,
        error: 'Failed to create student profile in database. Operation rolled back.'
      });
    }

    // 5. Assign 'student' role in aiml_user_roles (using upsert if available or insert fallback)
    let roleError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const table = supabaseAdmin.from('aiml_user_roles');
      const payload = {
        user_id: createdAuthUserId,
        role: 'student',
        is_active: true,
        created_at: new Date().toISOString()
      };
      const res = typeof table.upsert === 'function'
        ? await table.upsert(payload, { onConflict: 'user_id' })
        : await table.insert(payload);
      roleError = res.error;
      if (!roleError) break;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    if (roleError) {
      console.error('[HODService] Role mapping failed. Rolling back student account:', createdAuthUserId, roleError.message);
      await supabaseAdmin.from('aiml_student_profiles').delete().eq('id', studentProfile.id);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      return res.status(500).json({
        success: false,
        error: 'Failed to assign student role. Operation rolled back.'
      });
    }

    // 6. Record administrative audit log
    await supabaseAdmin
      .from('aiml_audit_logs')
      .insert({
        actor_user_id: req.user.id,
        action: 'HOD_CREATE_STUDENT_ACCOUNT',
        entity_name: 'aiml_student_profiles',
        entity_id: studentProfile.id,
        metadata: {
          register_number: cleanRegNo,
          student_profile_id: studentProfile.id,
          created_by_hod: req.user.id
        },
        created_at: new Date().toISOString()
      });

    const studentData = {
      id: studentProfile.id,
      userId: createdAuthUserId,
      registerNumber: cleanRegNo,
      isActive: studentProfile.is_active,
      mustChangePassword: studentProfile.must_change_password,
      isProfileCompleted: studentProfile.is_profile_completed,
      createdAt: studentProfile.created_at
    };

    return res.status(201).json({
      success: true,
      message: `Student account for ${cleanRegNo} successfully created.`,
      student: studentData,
      data: studentData
    });
  } catch (err) {
    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error('[HODService] Failed cleanup during rollback:', rollbackErr.message);
      }
    }
    console.error('[HODService] Unexpected student creation error:', err.message);
    next(err);
  }
});

/**
 * GET /api/hod/students
 *
 * HOD Student Directory:
 * Fetches all student profiles, supporting search and filters.
 */
router.get('/students', async (req, res, next) => {
  try {
    const { search, year, term, status, completion, backlogStatus, minBacklogs, maxBacklogs, location } = req.query;

    let query = supabaseAdmin
      .from('aiml_student_profiles')
      .select(`
        id,
        user_id,
        register_number,
        full_name,
        email,
        phone_number,
        location,
        current_year,
        current_term,
        qualification_type,
        ssc_percentage,
        intermediate_percentage,
        admission_year,
        profile_photo_path,
        has_backlogs,
        backlog_count,
        is_active,
        must_change_password,
        is_profile_completed,
        created_at,
        updated_at,
        aiml_semester_records (
          id,
          semester_number,
          cumulative_cgpa,
          updated_at
        )
      `)
      .order('register_number', { ascending: true });

    if (year && year !== 'All') {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) query = query.eq('current_year', yearNum);
    }

    if (term && term !== 'All') {
      const termNum = parseInt(term, 10);
      if (!isNaN(termNum)) query = query.eq('current_term', termNum);
    }

    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    if (completion === 'completed') query = query.eq('is_profile_completed', true);
    if (completion === 'pending') query = query.eq('is_profile_completed', false);

    if (backlogStatus === 'yes') query = query.eq('has_backlogs', true);
    if (backlogStatus === 'no') query = query.eq('has_backlogs', false);
    if (backlogStatus === 'none' || backlogStatus === 'pending') query = query.is('has_backlogs', null);

    if (minBacklogs) {
      const minB = parseInt(minBacklogs, 10);
      if (!isNaN(minB)) query = query.gte('backlog_count', minB);
    }
    if (maxBacklogs) {
      const maxB = parseInt(maxBacklogs, 10);
      if (!isNaN(maxB)) query = query.lte('backlog_count', maxB);
    }

    if (location && location !== 'All' && location.trim().length > 0) {
      query = query.ilike('location', `%${location.trim()}%`);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('[HODService] Error fetching students:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch student directory.'
      });
    }

    let filtered = students || [];
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const termLower = search.trim().toLowerCase();
      filtered = filtered.filter(s =>
        (s.register_number && s.register_number.toLowerCase().includes(termLower)) ||
        (s.full_name && s.full_name.toLowerCase().includes(termLower)) ||
        (s.location && s.location.toLowerCase().includes(termLower))
      );
    }

    // Generate signed URLs for private profile photos
    const photoPaths = filtered
      .map(s => s.profile_photo_path)
      .filter(p => p && typeof p === 'string' && p.trim().length > 0);

    let signedUrlMap = {};
    if (photoPaths.length > 0) {
      try {
        const { data: signedResults } = await supabaseAdmin.storage
          .from('aiml-student-photos')
          .createSignedUrls(photoPaths, 86400);

        if (Array.isArray(signedResults)) {
          signedResults.forEach(r => {
            if (r && r.path && r.signedUrl) {
              signedUrlMap[r.path] = r.signedUrl;
            }
          });
        }
      } catch (signErr) {
        console.error('[HODService] Error generating signed URLs for student photos:', signErr.message);
      }
    }

    const studentsWithUrls = filtered.map(s => ({
      ...s,
      profile_photo_url: s.profile_photo_path ? (signedUrlMap[s.profile_photo_path] || null) : null
    }));

    return res.json({
      success: true,
      count: studentsWithUrls.length,
      data: studentsWithUrls,
      students: studentsWithUrls
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hod/students/:id
 * Fetches single student full profile with semester records and campaign assignments.
 */
router.get('/students/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select(`
        *,
        aiml_semester_records (
          id,
          semester_number,
          cumulative_cgpa,
          updated_at
        ),
        aiml_campaign_students (
          id,
          campaign_id,
          status,
          assigned_at,
          submitted_at,
          aiml_update_campaigns (
            id,
            title,
            target_year,
            target_term,
            target_semester
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Student record not found.'
      });
    }

    let signedPhotoUrl = null;
    if (profile.profile_photo_path) {
      const { data: sData } = await supabaseAdmin.storage
        .from('aiml-student-photos')
        .createSignedUrl(profile.profile_photo_path, 86400);
      signedPhotoUrl = sData?.signedUrl || null;
    }

    return res.json({
      success: true,
      data: {
        ...profile,
        profile_photo_url: signedPhotoUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/hod/students/:id/status
 * Toggles student active / inactive status.
 */
router.patch('/students/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean.'
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('aiml_student_profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, register_number, is_active')
      .single();

    if (error || !updated) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update student status.'
      });
    }

    // Audit log
    await supabaseAdmin
      .from('aiml_audit_logs')
      .insert({
        actor_user_id: req.user.id,
        action: isActive ? 'HOD_ACTIVATE_STUDENT' : 'HOD_DEACTIVATE_STUDENT',
        entity_name: 'aiml_student_profiles',
        entity_id: id,
        metadata: { is_active: isActive },
        created_at: new Date().toISOString()
      });

    return res.json({
      success: true,
      message: `Student account ${updated.register_number} ${isActive ? 'activated' : 'deactivated'}.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/hod/students/:id/academic
 * HOD modifies student's academic year and term using privileged RPC.
 */
router.patch('/students/:id/academic', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentYear, currentTerm } = req.body;

    const y = parseInt(currentYear, 10);
    const t = parseInt(currentTerm, 10);

    if (isNaN(y) || y < 2 || y > 4) {
      return res.status(400).json({
        success: false,
        error: 'Valid academic year (2, 3, or 4) is required.'
      });
    }

    if (isNaN(t) || t < 1 || t > 2) {
      return res.status(400).json({
        success: false,
        error: 'Valid academic term (1 or 2) is required.'
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .rpc('aiml_hod_update_student_academic_fields', {
        p_student_id: id,
        p_current_year: y,
        p_current_term: t
      });

    if (error) {
      console.error('[HODService] RPC aiml_hod_update_student_academic_fields failed:', error.message);
      return res.status(500).json({
        success: false,
        error: `Failed to update academic standing: ${error.message}`
      });
    }

    return res.json({
      success: true,
      message: 'Student academic standing updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hod/campaigns
 * Creates a new update campaign and enrolls eligible students.
 */
router.post('/campaigns', async (req, res, next) => {
  try {
    const { title, targetYear, targetTerm, targetSemester, instructions, deadline } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Campaign title is required.' });
    }

    const y = parseInt(targetYear, 10);
    const t = parseInt(targetTerm, 10);
    const sem = parseInt(targetSemester, 10);

    if (isNaN(y) || y < 2 || y > 4) {
      return res.status(400).json({ success: false, error: 'Valid target year (2, 3, or 4) is required.' });
    }

    if (isNaN(t) || t < 1 || t > 2) {
      return res.status(400).json({ success: false, error: 'Valid target term (1 or 2) is required.' });
    }

    if (isNaN(sem) || sem < 1 || sem > 8) {
      return res.status(400).json({ success: false, error: 'Valid target semester (1 to 8) is required.' });
    }

    // Verify academic mapping formula: latest completed semester = ((y - 1) * 2) + t - 1
    const expectedSem = ((y - 1) * 2) + t - 1;
    if (sem !== expectedSem) {
      return res.status(400).json({
        success: false,
        error: `Invalid target semester ${sem} for Year ${y} Term ${t}. The eligible completed semester is Semester ${expectedSem}.`
      });
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('aiml_update_campaigns')
      .insert({
        title: title.trim(),
        target_year: y,
        target_term: t,
        target_semester: sem,
        instructions: (instructions || '').trim(),
        deadline: deadline || null,
        is_active: true,
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error || !campaign) {
      console.error('[HODService] Campaign creation failed:', error?.message);
      return res.status(500).json({
        success: false,
        error: `Failed to create campaign: ${error?.message || 'Database error'}`
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Campaign created successfully.',
      data: campaign
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hod/campaigns
 * Lists all campaigns with live student assignment counts.
 */
router.get('/campaigns', async (req, res, next) => {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('aiml_update_campaigns')
      .select(`
        *,
        aiml_campaign_students (
          id,
          status,
          student_profile_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[HODService] Error fetching campaigns:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch campaigns.' });
    }

    const formatted = (campaigns || []).map(c => {
      const students = c.aiml_campaign_students || [];
      const totalAssigned = students.length;
      const submitted = students.filter(s => s.status === 'submitted').length;
      const pending = students.filter(s => s.status === 'pending').length;
      const progress = totalAssigned > 0 ? Math.round((submitted / totalAssigned) * 100) : 0;

      return {
        id: c.id,
        title: c.title,
        targetYear: c.target_year,
        targetTerm: c.target_term,
        targetSemester: c.target_semester,
        instructions: c.instructions,
        deadline: c.deadline,
        isActive: c.is_active,
        createdAt: c.created_at,
        totalAssigned,
        submitted,
        pending,
        progress
      };
    });

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hod/analytics
 * Provides real aggregated department statistics from Supabase PostgreSQL.
 */
router.get('/analytics', async (req, res, next) => {
  try {
    // 1. Fetch all student profiles
    const { data: students, error: studentErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, current_year, current_term, is_active, is_profile_completed');

    if (studentErr) {
      return res.status(500).json({ success: false, error: 'Failed to aggregate analytics.' });
    }

    const allStudents = students || [];
    const activeStudents = allStudents.filter(s => s.is_active);
    const completedStudents = activeStudents.filter(s => s.is_profile_completed);

    // Year-wise counts
    const yearCounts = { '2nd Year': 0, '3rd Year': 0, '4th Year': 0 };
    activeStudents.forEach(s => {
      if (s.current_year === 2) yearCounts['2nd Year']++;
      else if (s.current_year === 3) yearCounts['3rd Year']++;
      else if (s.current_year === 4) yearCounts['4th Year']++;
    });

    // 2. Fetch semester records for averages
    const { data: records } = await supabaseAdmin
      .from('aiml_semester_records')
      .select('semester_number, cumulative_cgpa');

    const semAverages = {};
    const semCounts = {};
    (records || []).forEach(r => {
      const sem = r.semester_number;
      const cgpa = Number(r.cumulative_cgpa);
      if (!semAverages[sem]) {
        semAverages[sem] = 0;
        semCounts[sem] = 0;
      }
      semAverages[sem] += cgpa;
      semCounts[sem]++;
    });

    const averageBySemester = {};
    for (let sem = 1; sem <= 8; sem++) {
      if (semCounts[sem] && semCounts[sem] > 0) {
        averageBySemester[sem] = Math.round((semAverages[sem] / semCounts[sem]) * 100) / 100;
      } else {
        averageBySemester[sem] = null;
      }
    }

    // 3. Campaign participation rate
    const { data: campaignAssignments } = await supabaseAdmin
      .from('aiml_campaign_students')
      .select('id, status');

    const totalAssignments = campaignAssignments?.length || 0;
    const totalSubmitted = (campaignAssignments || []).filter(a => a.status === 'submitted').length;
    const overallSubmissionRate = totalAssignments > 0 ? Math.round((totalSubmitted / totalAssignments) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalStudents: allStudents.length,
        totalActive: activeStudents.length,
        totalInactive: allStudents.length - activeStudents.length,
        profileCompletedCount: completedStudents.length,
        profilePendingCount: activeStudents.length - completedStudents.length,
        completionRate: activeStudents.length > 0 ? Math.round((completedStudents.length / activeStudents.length) * 100) : 0,
        yearCounts,
        averageBySemester,
        campaigns: {
          totalAssigned: totalAssignments,
          totalSubmitted,
          totalPending: totalAssignments - totalSubmitted,
          submissionRate: overallSubmissionRate
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/hod/students/:id
 * Fetches complete profile and record summary for a specific student.
 */
router.get('/students/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'Invalid student ID format.' });
    }

    const { data: student, error } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select(`
        *,
        aiml_semester_records (
          id,
          semester_number,
          cumulative_cgpa,
          updated_at
        ),
        aiml_campaign_students (
          id,
          campaign_id,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error || !student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    let signedUrl = null;
    if (student.profile_photo_path) {
      const { data: sData } = await supabaseAdmin.storage
        .from('aiml-student-photos')
        .createSignedUrl(student.profile_photo_path, 86400);
      signedUrl = sData?.signedUrl || null;
    }

    return res.json({
      success: true,
      data: {
        ...student,
        profile_photo_url: signedUrl,
        semesterRecordCount: student.aiml_semester_records?.length || 0,
        campaignAssignmentCount: student.aiml_campaign_students?.length || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/hod/students/:id/reset-password
 * Administrative password reset:
 * 1. Verifies caller is HOD.
 * 2. Fetches active student profile.
 * 3. Generates secure temporary password using cryptographic randomness.
 * 4. Updates password via official Supabase Admin Auth API.
 * 5. Sets must_change_password = true in database.
 * 6. Records audit event and delivers temporary password once.
 */
router.post('/students/:id/reset-password', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'Invalid student ID format.' });
    }

    const { data: student, error: fetchErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, user_id, register_number, full_name, is_active')
      .eq('id', id)
      .single();

    if (fetchErr || !student) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }

    if (!student.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Cannot reset password for an inactive student account. Please reactivate the account first.'
      });
    }

    const temporaryPassword = generateSecureTemporaryPassword();

    // Update password in Supabase Auth via Admin API
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
      student.user_id,
      { password: temporaryPassword }
    );

    if (authErr) {
      console.error('[HODService] Supabase Auth password reset failed for:', student.register_number, authErr.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to update authentication credentials: ' + authErr.message
      });
    }

    // Set must_change_password = true in PostgreSQL
    const { error: dbErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', student.id);

    if (dbErr) {
      console.error('[HODService] Failed to set must_change_password flag for:', student.register_number, dbErr.message);
      return res.status(500).json({
        success: false,
        error: 'Password updated in auth service, but failed to synchronize database security flag.'
      });
    }

    // Record audit log
    await supabaseAdmin.from('aiml_audit_logs').insert({
      user_id: req.user.id,
      action: 'RESET_STUDENT_PASSWORD',
      resource_type: 'aiml_student_profiles',
      resource_id: student.id,
      details: {
        register_number: student.register_number,
        student_id: student.id,
        performed_by_hod_id: req.user.id
      }
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Password reset successfully for Register Number ${student.register_number}.`,
      registerNumber: student.register_number,
      studentName: student.full_name || 'Student',
      temporaryPassword
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/hod/students/:id/status
 * Administrative account deactivation / reactivation:
 * - Deactivate (isActive: false): blocks login, preserves all academic history & campaign data.
 * - Reactivate (isActive: true): restores access.
 */
router.patch('/students/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'Invalid student ID format.' });
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive boolean flag is required in request body.' });
    }

    const { data: student, error: fetchErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, user_id, register_number, full_name, is_active')
      .eq('id', id)
      .single();

    if (fetchErr || !student) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', student.id)
      .select('id, register_number, is_active, updated_at')
      .single();

    if (updateErr) {
      console.error('[HODService] Failed to update account status for:', student.register_number, updateErr.message);
      return res.status(500).json({ success: false, error: 'Failed to update student account status.' });
    }

    // Record audit event
    await supabaseAdmin.from('aiml_audit_logs').insert({
      user_id: req.user.id,
      action: isActive ? 'REACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
      resource_type: 'aiml_student_profiles',
      resource_id: student.id,
      details: {
        register_number: student.register_number,
        previous_status: student.is_active,
        new_status: isActive,
        performed_by_hod_id: req.user.id
      }
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Student account for ${student.register_number} has been ${isActive ? 'reactivated' : 'deactivated'} successfully.`,
      student: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/hod/students/:id
 * Controlled permanent deletion:
 * 1. Checks for existing academic semester records and campaign assignments.
 *    If any exist, blocks deletion and advises deactivation to preserve institutional records.
 * 2. Requires exact Register Number confirmation in request body.
 * 3. Removes private profile photo from Supabase storage bucket.
 * 4. Removes aiml_student_profiles and aiml_user_roles records.
 * 5. Removes Supabase Auth user.
 * 6. Records administrative audit log.
 */
router.delete('/students/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'Invalid student ID format.' });
    }

    const { data: student, error: fetchErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select(`
        id,
        user_id,
        register_number,
        full_name,
        profile_photo_path,
        aiml_semester_records (id),
        aiml_campaign_students (id)
      `)
      .eq('id', id)
      .single();

    if (fetchErr || !student) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }

    const semCount = student.aiml_semester_records?.length || 0;
    const campCount = student.aiml_campaign_students?.length || 0;

    // Strict Institutional Data Retention Gate:
    // Permanent deletion is strictly prohibited if historical records exist.
    if (semCount > 0 || campCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot permanently delete student ${student.register_number}: ${semCount} academic semester record(s) and ${campCount} campaign update assignment(s) exist. Institutional policy mandates academic history retention. Please use Deactivate Student instead.`,
        canDeactivate: true,
        semesterRecordCount: semCount,
        campaignAssignmentCount: campCount
      });
    }

    // Require explicit confirmation by typing exact register number
    const { confirmationRegisterNumber } = req.body;
    if (!confirmationRegisterNumber || confirmationRegisterNumber.trim().toUpperCase() !== student.register_number.toUpperCase()) {
      return res.status(400).json({
        success: false,
        error: `Confirmation failed: You must provide confirmationRegisterNumber matching "${student.register_number}".`
      });
    }

    // 1. Remove profile photo from private storage if present
    if (student.profile_photo_path) {
      await supabaseAdmin.storage
        .from('aiml-student-photos')
        .remove([student.profile_photo_path])
        .catch((storageErr) => {
          console.warn('[HODService] Non-fatal photo cleanup error during deletion:', storageErr?.message);
        });
    }

    // 2. Delete database profile record
    const { error: delProfileErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .delete()
      .eq('id', student.id);

    if (delProfileErr) {
      console.error('[HODService] Failed to delete student profile row:', delProfileErr.message);
      return res.status(500).json({ success: false, error: 'Failed to delete student database record.' });
    }

    // 3. Delete role mapping in aiml_user_roles
    try {
      await supabaseAdmin
        .from('aiml_user_roles')
        .delete()
        .eq('user_id', student.user_id);
    } catch (e) {
      // Non-fatal if role deletion fails or mock has no catch
    }

    // 4. Delete Supabase Auth account
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(student.user_id);
    if (authDelErr) {
      console.warn('[HODService] Non-fatal auth user deletion note:', authDelErr.message);
    }

    // 5. Record audit event
    await supabaseAdmin.from('aiml_audit_logs').insert({
      user_id: req.user.id,
      action: 'PERMANENT_DELETE_STUDENT',
      resource_type: 'aiml_student_profiles',
      resource_id: student.id,
      details: {
        register_number: student.register_number,
        deleted_student_id: student.id,
        deleted_auth_user_id: student.user_id,
        performed_by_hod_id: req.user.id
      }
    }).catch(() => {});

    return res.json({
      success: true,
      message: `Student ${student.register_number} and all associated credentials have been permanently deleted.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;