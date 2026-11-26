import { supabaseAdmin, isSupabaseAdminReady } from '../config/supabaseAdmin.js';

/**
 * Returns deterministic internal email for a student's Register Number.
 * Format: <regno>@student.aiml.mictech.ac.in
 *
 * @param {string} registerNumber - Raw or uppercase Register Number
 * @returns {string} Sanitized internal student email address
 */
export function getDeterministicStudentEmail(registerNumber) {
  if (!registerNumber || typeof registerNumber !== 'string') {
    throw new Error('Valid Register Number required for identity mapping.');
  }
  const clean = registerNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@student.aiml.mictech.ac.in`;
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
 * Role-Based Authorization Middleware:
 * Enforces that the authenticated user possesses verified HOD administrative status.
 */
export async function requireHodRole(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Authentication required.'
      });
    }

    const { data: roleRecord, error } = await supabaseAdmin
      .from('aiml_user_roles')
      .select('role, is_active')
      .eq('user_id', req.user.id)
      .eq('role', 'hod')
      .eq('is_active', true)
      .single();

    if (error || !roleRecord) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: HOD administrative privileges required.'
      });
    }

    req.userRole = 'hod';
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * First-Login Password Gate Middleware:
 * Verifies that the authenticated student has already updated their temporary password.
 * Rejects access whenever must_change_password is anything other than false (blocks true, null, undefined).
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
