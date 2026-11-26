import { Router } from 'express';
import { supabaseAdmin, isSupabaseAdminReady } from '../config/supabaseAdmin.js';
import { requireAuth, requireHodRole, getDeterministicStudentEmail } from '../middleware/authMiddleware.js';

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

    // 5. Assign 'student' role in aiml_user_roles
    const { error: roleError } = await supabaseAdmin
      .from('aiml_user_roles')
      .insert({
        user_id: createdAuthUserId,
        role: 'student',
        created_at: new Date().toISOString()
      });

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
    const { search, year, term, status, completion } = req.query;

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

    return res.json({
      success: true,
      count: filtered.length,
      data: filtered
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

    return res.json({
      success: true,
      data: profile
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

export default router;