import { Router } from 'express';
import { supabaseAdmin, isSupabaseAdminReady } from '../config/supabaseAdmin.js';

const router = Router();

// Standard UUID format validator (v1-v5)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Validates that an input string is a valid UUID format.
 *
 * @param {string} id - The string to test.
 * @returns {boolean} True if id matches UUID syntax.
 */
export function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

/**
 * Authentication Middleware:
 * Validates the caller's Supabase JWT from the Authorization header.
 * Attaches req.user (authenticated Supabase user object) and req.token.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim().length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid authentication token.'
      });
    }

    if (!isSupabaseAdminReady()) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Supabase Admin client not initialized.'
      });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired authentication session.'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * First-Login Password Gate Middleware:
 * Verifies that the authenticated student has already updated their temporary password.
 * Blocks access to dashboard and academic submissions while must_change_password = true.
 */
export async function requirePasswordChanged(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required.'
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, user_id, register_number, full_name, current_year, current_term, is_active, must_change_password, is_profile_completed')
      .eq('user_id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found.'
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Inactive student account.'
      });
    }

    // Reject access whenever must_change_password is anything other than false (blocks true, null, undefined)
    if (profile.must_change_password !== false) {
      return res.status(403).json({
        success: false,
        error: 'Initial password change required before accessing this resource.',
        code: 'MUST_CHANGE_PASSWORD'
      });
    }

    req.studentProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Profile Completion Gate Middleware:
 * Verifies that the student has completed onboarding profile setup.
 * Blocks access to main dashboard and academic features while is_profile_completed = false.
 */
export async function requireProfileCompleted(req, res, next) {
  try {
    const profile = req.studentProfile;
    if (!profile) {
      return res.status(500).json({
        success: false,
        error: 'Internal error: Student profile context missing.'
      });
    }

    if (!profile.is_profile_completed) {
      return res.status(403).json({
        success: false,
        error: 'Profile completion required before accessing dashboard resources.',
        code: 'PROFILE_COMPLETION_REQUIRED'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/student/change-initial-password
 *
 * Dedicated authenticated endpoint for initial student password change:
 * 1. Requires valid Supabase JWT.
 * 2. Uses strictly the verified req.user.id (ignores any arbitrary user ID inputs).
 * 3. Verifies that the authenticated user has an active student profile.
 * 4. Updates password via supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword }).
 * 5. Password validation: rejects empty or whitespace-only, preserves spaces, validates min length >= 6.
 * 6. Only after successful Auth update, sets must_change_password = false in the database.
 * 7. Scopes database update strictly to user_id = req.user.id and is_active = true.
 * 8. Never exposes service-role credentials or logs plaintext passwords.
 * 9. Handles partial failure safely if Auth update succeeds but database flag update fails.
 */
router.post('/change-initial-password', requireAuth, async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    // Reject empty or whitespace-only passwords
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'New password is required.'
      });
    }

    // Validate minimum length without trimming (preserve actual password whitespace)
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.'
      });
    }

    // Verify caller has an active student profile using verified req.user.id
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, user_id, register_number, is_active, must_change_password, is_profile_completed')
      .eq('user_id', req.user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found.'
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Inactive student account.'
      });
    }

    // Step 4: Update password using standard Admin Auth API for verified req.user.id
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: newPassword }
    );

    if (authError || !authData?.user) {
      console.error('[StudentAuth] Supabase Admin Auth password update rejected for user:', req.user.id, authError?.message);
      return res.status(400).json({
        success: false,
        error: authError?.message || 'Failed to update password. Please ensure password meets security criteria.'
      });
    }

    // Step 5: Update must_change_password = false in database
    // Strictly scoped to authenticated caller's own profile and active status
    const { data: updatedProfile, error: dbError } = await supabaseAdmin
      .from('aiml_student_profiles')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .select('id, user_id, register_number, must_change_password, is_profile_completed')
      .single();

    if (dbError || !updatedProfile) {
      // Partial failure: Auth password update succeeded, but database flag update failed
      console.error(
        '[StudentAuth] CRITICAL: Supabase Auth password updated but database flag sync failed for user:',
        req.user.id,
        dbError?.message
      );
      return res.status(500).json({
        success: false,
        error: 'Password updated successfully in authentication service, but failed to update security status. Please contact support.',
        code: 'AUTH_UPDATED_FLAG_SYNC_FAILED'
      });
    }

    // Return sanitized status
    return res.json({
      success: true,
      message: 'Initial password successfully changed. You may now complete your profile.',
      data: {
        mustChangePassword: false,
        isProfileCompleted: updatedProfile.is_profile_completed
      }
    });
  } catch (err) {
    console.error('[StudentAuth] Unexpected error during password update:', err.message);
    next(err);
  }
});

/**
 * POST /api/student/complete-profile
 *
 * Backend-mediated profile completion flow:
 * 1. Student sends profile completion request with authenticated session.
 * 2. Backend validates studentProfileId format as a UUID before database queries.
 * 3. Backend verifies profile ownership using authenticated req.user.id.
 * 4. Backend rejects inactive profiles.
 * 5. Backend consistently rejects already-completed profiles.
 * 6. Backend blocks profile completion while must_change_password = true.
 * 7. Backend validates photo path ownership (${req.user.id}/) and prevents path traversal.
 * 8. Backend validates mandatory onboarding fields and saves them directly with ownership & active conditions.
 * 9. Backend verifies that the update affected exactly one row before calling the completion RPC.
 * 10. Backend executes the secure aiml_complete_student_profile() RPC with service_role.
 * 11. Returns only sanitized necessary profile information.
 */
router.post('/complete-profile', requireAuth, async (req, res, next) => {
  try {
    const { studentProfileId } = req.body;
    const authUserId = req.user.id;

    // 1. Validate studentProfileId format as UUID before database queries
    if (!studentProfileId || !isValidUUID(studentProfileId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid studentProfileId: Must be a valid UUID format.'
      });
    }

    // 2. Fetch existing profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('*')
      .eq('id', studentProfileId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found.'
      });
    }

    // 3. Verify profile ownership using authenticated user id
    if (profile.user_id !== authUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not own this student profile.'
      });
    }

    // 4. Reject inactive profiles
    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Inactive student profiles cannot be completed.'
      });
    }

    // 5. Handle already-completed profiles consistently
    if (profile.is_profile_completed) {
      return res.status(400).json({
        success: false,
        error: 'Student profile is already completed.'
      });
    }

    // 6. Block profile completion if initial password has not been changed (must be explicitly false)
    if (profile.must_change_password !== false) {
      return res.status(403).json({
        success: false,
        error: 'Please change your initial password before completing your student profile.',
        code: 'MUST_CHANGE_PASSWORD'
      });
    }

    // 7. Profile Photo Ownership & Path Traversal Protection
    const rawPhotoPath = req.body.profilePhotoPath ?? req.body.profile_photo_path ?? profile.profile_photo_path;
    let profilePhotoPath = null;
    if (rawPhotoPath !== null && rawPhotoPath !== undefined && String(rawPhotoPath).trim().length > 0) {
      const pathStr = String(rawPhotoPath).trim();
      const expectedPrefix = `${authUserId}/`;

      // Check path traversal & prefix
      if (
        !pathStr.startsWith(expectedPrefix) ||
        pathStr.includes('..') ||
        pathStr.includes('\\') ||
        pathStr.includes('//')
      ) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Profile photo path must reside directly inside your own user storage directory without path traversal.'
        });
      }
      profilePhotoPath = pathStr;
    }

    // 8. Mandatory onboarding fields validation
    const fullName = (req.body.fullName ?? req.body.full_name ?? req.body.name ?? profile.full_name ?? '').toString().trim();
    const email = (req.body.email ?? profile.email ?? '').toString().trim();
    const phoneNumber = (req.body.phoneNumber ?? req.body.phone_number ?? req.body.phone ?? profile.phone_number ?? '').toString().trim();
    const location = (req.body.location ?? profile.location ?? '').toString().trim();

    let rawYear = req.body.currentYear ?? req.body.current_year ?? req.body.year ?? profile.current_year;
    let currentYear = typeof rawYear === 'number' ? rawYear : parseInt(String(rawYear || '').replace(/\D/g, ''), 10);

    let rawTerm = req.body.currentTerm ?? req.body.current_term ?? req.body.term ?? profile.current_term;
    let currentTerm;
    if (typeof rawTerm === 'number') {
      currentTerm = rawTerm;
    } else {
      const termStr = String(rawTerm || '').trim();
      if (termStr.includes('-')) {
        currentTerm = parseInt(termStr.split('-')[1], 10);
      } else {
        currentTerm = parseInt(termStr.replace(/\D/g, ''), 10);
      }
    }

    const qualificationType = (req.body.qualificationType ?? req.body.qualification_type ?? req.body.interType ?? profile.qualification_type ?? '')
      .toString()
      .toLowerCase()
      .trim();

    const sscPercentage = parseFloat(req.body.sscPercentage ?? req.body.ssc_percentage ?? profile.ssc_percentage);
    const intermediatePercentage = parseFloat(req.body.intermediatePercentage ?? req.body.intermediate_percentage ?? req.body.interPercentage ?? profile.intermediate_percentage);

    const admissionYear = req.body.admissionYear ?? req.body.admission_year ?? profile.admission_year;

    if (!fullName || fullName.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Full Name is required before completing profile.'
      });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'A valid email address is required before completing profile.'
      });
    }

    if (!phoneNumber || phoneNumber.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Phone Number is required before completing profile.'
      });
    }

    if (!location || location.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Location is required before completing profile.'
      });
    }

    if (isNaN(currentYear) || currentYear < 2 || currentYear > 4) {
      return res.status(400).json({
        success: false,
        error: 'Valid Academic Year (2, 3, or 4) is required.'
      });
    }

    if (isNaN(currentTerm) || currentTerm < 1 || currentTerm > 2) {
      return res.status(400).json({
        success: false,
        error: 'Valid Academic Term (1 or 2) is required.'
      });
    }

    if (!qualificationType || !['intermediate', 'diploma'].includes(qualificationType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid Qualification Type (intermediate or diploma) is required.'
      });
    }

    if (isNaN(sscPercentage) || sscPercentage < 0 || sscPercentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'SSC Percentage must be between 0.00 and 100.00.'
      });
    }

    if (isNaN(intermediatePercentage) || intermediatePercentage < 0 || intermediatePercentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Intermediate/Diploma Percentage must be between 0.00 and 100.00.'
      });
    }

    // 9. Strengthened Profile Update: Enforce ownership, active status, and incomplete conditions in the UPDATE query
    const updatePayload = {
      full_name: fullName,
      email: email,
      phone_number: phoneNumber,
      location: location,
      current_year: currentYear,
      current_term: currentTerm,
      qualification_type: qualificationType,
      ssc_percentage: sscPercentage,
      intermediate_percentage: intermediatePercentage,
      profile_photo_path: profilePhotoPath,
      updated_at: new Date().toISOString()
    };

    if (admissionYear !== undefined && admissionYear !== null) {
      updatePayload.admission_year = parseInt(admissionYear, 10);
    }

    const { data: updatedRows, error: saveError } = await supabaseAdmin
      .from('aiml_student_profiles')
      .update(updatePayload)
      .eq('id', studentProfileId)
      .eq('user_id', authUserId)
      .eq('is_active', true)
      .eq('is_profile_completed', false)
      .select('id');

    if (saveError) {
      console.error('[StudentService] Failed to save onboarding details for profile:', studentProfileId, saveError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to save student profile information.'
      });
    }

    // Verify update affected exactly one row
    if (!updatedRows || updatedRows.length !== 1) {
      return res.status(409).json({
        success: false,
        error: 'Student profile could not be updated. Ensure the profile is active, owned by you, and not already completed.'
      });
    }

    // 10. Execute server-mediated completion using Supabase Admin RPC
    const { data: updatedProfile, error: rpcError } = await supabaseAdmin
      .rpc('aiml_complete_student_profile', {
        p_student_id: studentProfileId
      });

    if (rpcError) {
      console.error('[StudentService] aiml_complete_student_profile RPC failed for profile:', studentProfileId, rpcError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to finalize profile completion. Please check provided details and try again.'
      });
    }

    // 11. Return only sanitized, necessary profile information
    const sanitizedData = {
      id: updatedProfile.id,
      userId: updatedProfile.user_id,
      registerNumber: updatedProfile.register_number,
      fullName: updatedProfile.full_name,
      email: updatedProfile.email,
      phoneNumber: updatedProfile.phone_number,
      location: updatedProfile.location,
      currentYear: updatedProfile.current_year,
      currentTerm: updatedProfile.current_term,
      qualificationType: updatedProfile.qualification_type,
      sscPercentage: updatedProfile.ssc_percentage,
      intermediatePercentage: updatedProfile.intermediate_percentage,
      admissionYear: updatedProfile.admission_year,
      profilePhotoPath: updatedProfile.profile_photo_path,
      isProfileCompleted: true,
      mustChangePassword: false,
      updatedAt: updatedProfile.updated_at
    };

    return res.json({
      success: true,
      message: 'Student profile successfully marked as completed.',
      data: sanitizedData
    });
  } catch (err) {
    console.error('[StudentService] Unexpected error completing profile:', err.message);
    next(err);
  }
});

/**
 * GET /api/student/profile
 * Returns the authenticated student's profile information.
 */
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('id, user_id, register_number, full_name, email, phone_number, location, current_year, current_term, qualification_type, ssc_percentage, intermediate_percentage, admission_year, profile_photo_path, is_active, must_change_password, is_profile_completed, created_at, updated_at')
      .eq('user_id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found.'
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Inactive student account.'
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
 * GET /api/student/dashboard
 * Protected student dashboard endpoint:
 * Blocked while must_change_password = true.
 * Blocked while is_profile_completed = false.
 */
router.get('/dashboard', requireAuth, requirePasswordChanged, requireProfileCompleted, async (req, res, next) => {
  try {
    return res.json({
      success: true,
      message: 'Student dashboard retrieved successfully.',
      data: {
        profileId: req.studentProfile.id,
        registerNumber: req.studentProfile.register_number,
        fullName: req.studentProfile.full_name,
        isProfileCompleted: true,
        mustChangePassword: false
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/student/records
 *
 * Real Semester CGPA Persistence:
 * - student_profile_id
 * - semester_number
 * - cumulative_cgpa
 *
 * Protected by requireAuth, requirePasswordChanged, and requireProfileCompleted.
 * Validates ownership, completed-semester eligibility formula:
 * maxCompletedSemester = ((current_year - 1) * 2) + current_term - 1
 * Rejects invalid, ongoing, and future semesters.
 * Persists record to aiml_semester_records table.
 */
router.post('/records', requireAuth, requirePasswordChanged, requireProfileCompleted, async (req, res, next) => {
  try {
    const profile = req.studentProfile;
    const semNum = parseInt(req.body.semesterNumber ?? req.body.semester_number, 10);
    const cgpaVal = parseFloat(req.body.cumulativeCgpa ?? req.body.cumulative_cgpa);

    // Validate semester number bounds
    if (isNaN(semNum) || semNum < 1 || semNum > 8) {
      return res.status(400).json({
        success: false,
        error: 'Semester number must be an integer between 1 and 8.'
      });
    }

    // Validate cumulative CGPA bounds
    if (isNaN(cgpaVal) || cgpaVal < 0.00 || cgpaVal > 10.00) {
      return res.status(400).json({
        success: false,
        error: 'Cumulative CGPA must be a valid number between 0.00 and 10.00.'
      });
    }

    // Completed semester eligibility validation:
    // Formula: maxCompletedSemester = ((current_year - 1) * 2) + current_term - 1
    const maxCompletedSem = ((profile.current_year - 1) * 2) + profile.current_term - 1;

    if (semNum > maxCompletedSem) {
      return res.status(400).json({
        success: false,
        error: `Semester ${semNum} is an ongoing or future semester. Maximum completed semester eligible for recording is Semester ${maxCompletedSem} based on student standing (Year ${profile.current_year}, Term ${profile.current_term}).`
      });
    }

    // Format CGPA to 2 decimal places
    const formattedCgpa = Math.round(cgpaVal * 100) / 100;

    const recordPayload = {
      student_profile_id: profile.id,
      semester_number: semNum,
      cumulative_cgpa: formattedCgpa,
      updated_at: new Date().toISOString()
    };

    // Upsert record into aiml_semester_records
    const { data: record, error: dbError } = await supabaseAdmin
      .from('aiml_semester_records')
      .upsert(recordPayload, { onConflict: 'student_profile_id, semester_number' })
      .select('id, student_profile_id, semester_number, cumulative_cgpa, updated_at')
      .single();

    if (dbError || !record) {
      console.error('[StudentRecords] Failed to persist semester record:', dbError?.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to record semester CGPA. Please try again.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Semester CGPA record saved successfully.',
      data: {
        id: record.id,
        studentProfileId: record.student_profile_id,
        semesterNumber: record.semester_number,
        cumulativeCgpa: Number(record.cumulative_cgpa),
        updatedAt: record.updated_at
      }
    });
  } catch (err) {
    console.error('[StudentRecords] Unexpected error submitting record:', err.message);
    next(err);
  }
});

/**
 * GET /api/student/records
 * Returns all semester records for the authenticated student.
 */
router.get('/records', requireAuth, requirePasswordChanged, requireProfileCompleted, async (req, res, next) => {
  try {
    const { data: records, error } = await supabaseAdmin
      .from('aiml_semester_records')
      .select('id, semester_number, cumulative_cgpa, created_at, updated_at')
      .eq('student_profile_id', req.studentProfile.id)
      .order('semester_number', { ascending: true });

    if (error) {
      console.error('[StudentService] Error fetching records:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch academic records.' });
    }

    return res.json({
      success: true,
      data: (records || []).map(r => ({
        id: r.id,
        semesterNumber: r.semester_number,
        cumulativeCgpa: Number(r.cumulative_cgpa),
        updatedAt: r.updated_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/student/campaigns
 * Returns active update requests assigned to the authenticated student.
 */
router.get('/campaigns', requireAuth, requirePasswordChanged, requireProfileCompleted, async (req, res, next) => {
  try {
    const { data: assignments, error } = await supabaseAdmin
      .from('aiml_campaign_students')
      .select(`
        id,
        status,
        assigned_at,
        submitted_at,
        aiml_update_campaigns (
          id,
          title,
          target_year,
          target_term,
          target_semester,
          instructions,
          deadline,
          is_active
        )
      `)
      .eq('student_profile_id', req.studentProfile.id);

    if (error) {
      console.error('[StudentService] Error fetching campaigns:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to fetch campaigns.' });
    }

    const formatted = (assignments || [])
      .filter(a => a.aiml_update_campaigns && a.aiml_update_campaigns.is_active)
      .map(a => ({
        assignmentId: a.id,
        campaignId: a.aiml_update_campaigns.id,
        title: a.aiml_update_campaigns.title,
        targetYear: a.aiml_update_campaigns.target_year,
        targetTerm: a.aiml_update_campaigns.target_term,
        targetSemester: a.aiml_update_campaigns.target_semester,
        instructions: a.aiml_update_campaigns.instructions,
        deadline: a.aiml_update_campaigns.deadline,
        status: a.status,
        submittedAt: a.submitted_at
      }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

export default router;