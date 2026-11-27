import { Router } from 'express';
import { supabaseAdmin, isSupabaseAdminReady, createAuthClient } from '../config/supabaseAdmin.js';
import { requireAuth, getDeterministicStudentEmail } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * POST /api/auth/login
 *
 * Dedicated HOD / Administrative Authentication:
 * 1. Accepts email and password.
 * 2. Authenticates via Supabase Auth.
 * 3. Strictly verifies that user has 'hod' role in aiml_user_roles.
 * 4. Rejects non-HOD users from accessing administrative console.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    if (!isSupabaseAdminReady()) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable.'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Authenticate with Supabase Auth via isolated auth client (avoids mutating service_role session)
    const authClient = createAuthClient() || supabaseAdmin;
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: trimmedEmail,
      password: password
    });

    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const authUser = authData.user;

    // Verify HOD role in database
    const { data: roleRecord, error: roleError } = await supabaseAdmin
      .from('aiml_user_roles')
      .select('role, is_active')
      .eq('user_id', authUser.id)
      .single();

    if (roleError || !roleRecord || roleRecord.role !== 'hod' || !roleRecord.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not possess active HOD administrative permissions.'
      });
    }

    return res.json({
      success: true,
      message: 'HOD authenticated successfully.',
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresAt: authData.session.expires_at,
      expiresIn: authData.session.expires_in,
      user: {
        id: authUser.id,
        email: authUser.email,
        role: 'hod',
        name: 'Dr. Thatibalamuralikrishna',
        title: 'Professor & Head of Department',
        department: 'Department of Artificial Intelligence and Machine Learning'
      }
    });
  } catch (err) {
    console.error('[AuthService] Login error:', err.message);
    next(err);
  }
});

/**
 * POST /api/auth/student-login
 *
 * Dedicated Student Authentication via Register Number:
 * 1. Accepts student Register Number and password.
 * 2. Derives deterministic internal student identity.
 * 3. Authenticates via Supabase Auth without exposing internal email mapping.
 * 4. Verifies active account status in aiml_student_profiles.
 * 5. Returns session token, profile completion status, and password change requirement.
 */
router.post('/student-login', async (req, res, next) => {
  try {
    const { registerNumber, password } = req.body;

    if (!registerNumber || !password || typeof registerNumber !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Register Number and password are required.'
      });
    }

    if (!isSupabaseAdminReady()) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service unavailable.'
      });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const internalEmail = getDeterministicStudentEmail(cleanRegNo);

    // Authenticate via Supabase Auth using isolated client
    const authClient = createAuthClient() || supabaseAdmin;
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: internalEmail,
      password: password
    });

    if (authError || !authData?.user || !authData?.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Register Number or password.'
      });
    }

    const authUser = authData.user;

    // Fetch student profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'Student profile record not found in department directory.'
      });
    }

    if (!profile.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Student account has been deactivated. Please contact the AIML Department HOD.'
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
      message: 'Student authenticated successfully.',
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresAt: authData.session.expires_at,
      expiresIn: authData.session.expires_in,
      user: {
        id: authUser.id,
        role: 'student',
        registerNumber: profile.register_number,
        fullName: profile.full_name,
        email: profile.email
      },
      mustChangePassword: profile.must_change_password !== false,
      isProfileCompleted: Boolean(profile.is_profile_completed),
      profile: {
        id: profile.id,
        registerNumber: profile.register_number,
        fullName: profile.full_name,
        email: profile.email,
        phoneNumber: profile.phone_number,
        location: profile.location,
        currentYear: profile.current_year,
        currentTerm: profile.current_term,
        qualificationType: profile.qualification_type,
        sscPercentage: profile.ssc_percentage,
        intermediatePercentage: profile.intermediate_percentage,
        profilePhotoPath: profile.profile_photo_path,
        profilePhotoUrl: signedPhotoUrl,
        profile_photo_url: signedPhotoUrl,
        mustChangePassword: profile.must_change_password !== false,
        isProfileCompleted: Boolean(profile.is_profile_completed),
        isActive: profile.is_active
      }
    });
  } catch (err) {
    console.error('[AuthService] Student login error:', err.message);
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user and profile context.
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: roleRecord } = await supabaseAdmin
      .from('aiml_user_roles')
      .select('role, is_active')
      .eq('user_id', req.user.id)
      .single();

    const role = (roleRecord?.is_active && roleRecord?.role === 'hod') ? 'hod' : 'student';

    if (role === 'hod') {
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          role: 'hod',
          name: 'Dr. Thatibalamuralikrishna',
          title: 'Professor & Head of Department',
          department: 'Department of Artificial Intelligence and Machine Learning'
        }
      });
    }

    // Student profile
    const { data: profile } = await supabaseAdmin
      .from('aiml_student_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    let signedPhotoUrl = null;
    if (profile?.profile_photo_path) {
      const { data: sData } = await supabaseAdmin.storage
        .from('aiml-student-photos')
        .createSignedUrl(profile.profile_photo_path, 86400);
      signedPhotoUrl = sData?.signedUrl || null;
    }

    return res.json({
      success: true,
      user: {
        id: req.user.id,
        role: 'student',
        registerNumber: profile?.register_number,
        fullName: profile?.full_name,
        email: profile?.email
      },
      mustChangePassword: profile ? profile.must_change_password !== false : true,
      isProfileCompleted: Boolean(profile?.is_profile_completed),
      profile: profile ? {
        ...profile,
        profile_photo_url: signedPhotoUrl,
        profilePhotoUrl: signedPhotoUrl
      } : null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Securely refreshes an expired access token using the user's refresh token.
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required.'
      });
    }

    const authClient = createAuthClient() || supabaseAdmin;
    const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data?.session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired refresh token.'
      });
    }

    return res.json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      expiresIn: data.session.expires_in
    });
  } catch (err) {
    next(err);
  }
});

export default router;