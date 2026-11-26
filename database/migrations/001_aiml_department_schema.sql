-- ============================================================================
-- MIGRATION: 001_aiml_department_schema.sql
-- PROJECT: AIML Department Student Academic Management System
-- INSTITUTION: DVR & Dr. HS MIC College of Technology
-- DEPARTMENT: Artificial Intelligence and Machine Learning (AIML)
--
-- REVISION: Final Pre-Deployment Security Hardening:
--           1. Backend-Controlled First-Login Flags (must_change_password, is_profile_completed).
--           2. Multi-Dimensional Campaign Auto-Enrollment & Target Year CGPA Pre-Check.
--           3. Scoped Student Campaign Visibility (target_year & campaign_students assignment).
--           4. Trusted Service-Role / HOD Recognition without auth.uid() Null Rejection.
--           5. Completed Semesters Only Enforcement for Student Writes.
--           6. Column-Level Privilege Separation (No direct student access to login flags).
--
-- DESIGNED CAPACITY: 400 - 1,000+ students.
-- SAFETY: Non-destructive, idempotent, zero impact on unrelated schemas or objects.
-- ============================================================================

-- Ensure required extension for cryptographic UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: HARDENED HELPER FUNCTIONS (SECURITY DEFINER WITH search_path = '')
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: public.aiml_is_service_role()
-- Identifies requests authenticated with the trusted Supabase service_role key.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(auth.role() = 'service_role', false);
$$;

COMMENT ON FUNCTION public.aiml_is_service_role() IS 'Returns true if the request is authenticated via the backend Supabase Admin service_role key.';

REVOKE ALL ON FUNCTION public.aiml_is_service_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aiml_is_service_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.aiml_is_service_role() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Function: public.aiml_is_hod()
-- Hardened HOD verification helper. Identifies actual authenticated HOD users.
-- Does NOT conflate service_role with HOD identity.
-- SECURITY DEFINER with empty search_path to prevent search_path hijacking.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_is_hod()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.aiml_user_roles
    WHERE user_id = auth.uid()
      AND role = 'hod'
      AND is_active = true
  );
$$;

COMMENT ON FUNCTION public.aiml_is_hod() IS 'Returns true if the authenticated user has verified HOD status in the AIML department.';

REVOKE ALL ON FUNCTION public.aiml_is_hod() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aiml_is_hod() FROM anon;
GRANT EXECUTE ON FUNCTION public.aiml_is_hod() TO authenticated, service_role;


-- ============================================================================
-- SECTION 2: APPLICATION TABLES (WITH ONBOARDING & HISTORY PRESERVATION)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE 1: aiml_user_roles
-- Purpose: System-level role mapping for HOD and Student authorization.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hod', 'student')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.aiml_user_roles IS 'Role assignments for AIML portal users. Modification is strictly restricted to trusted administrative operations.';


-- ----------------------------------------------------------------------------
-- TABLE 2: aiml_student_profiles
-- Purpose: Student personal and academic background information.
--
-- Onboarding State Support:
-- HOD provisions account with register_number only. All profile details
-- (full_name, admission_year, current_year, current_term, qualifications)
-- are nullable initially and completed by the student upon first login.
--
-- Academic Constraints:
-- Allowed academic years: 2 (Second Year), 3 (Third Year), 4 (Fourth Year).
-- Allowed academic terms: 1 (Term 1, e.g. 2-1, 3-1, 4-1), 2 (Term 2, e.g. 2-2, 3-2, 4-2).
--
-- Backend-Controlled First-Login Flags:
-- must_change_password and is_profile_completed are backend-controlled and
-- cannot be modified directly via student UPDATE queries.
--
-- Academic Preservation Rule:
-- user_id uses ON DELETE SET NULL to prevent permanent deletion of academic
-- records if an authentication account is removed. is_active flag supports
-- non-destructive account deactivation.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  register_number TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  location TEXT,
  profile_photo_path TEXT,
  admission_year INTEGER,
  current_year INTEGER CHECK (current_year BETWEEN 2 AND 4),
  current_term INTEGER CHECK (current_term BETWEEN 1 AND 2),
  qualification_type TEXT CHECK (qualification_type IN ('intermediate', 'diploma')),
  ssc_percentage NUMERIC(5,2) CHECK (ssc_percentage >= 0.00 AND ssc_percentage <= 100.00),
  intermediate_percentage NUMERIC(5,2) CHECK (intermediate_percentage >= 0.00 AND intermediate_percentage <= 100.00),
  is_profile_completed BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT chk_register_number_not_empty CHECK (pg_catalog.length(pg_catalog.btrim(register_number)) > 0)
);

COMMENT ON TABLE public.aiml_student_profiles IS 'Personal and academic profile of AIML students. Supports partial onboarding states, 2nd-4th year academic progression, and backend-controlled first-login flags.';


-- ----------------------------------------------------------------------------
-- TABLE 3: aiml_semester_records
-- Purpose: Cumulative semester-wise CGPA records (Semesters 1 through 8).
--
-- Academic Rules:
-- 1. Cumulative CGPA only (0.00 - 10.00 scale). Zero percentage conversion stored.
-- 2. Only completed semesters may be recorded. No ongoing or future semester entries.
-- 3. Student can insert/update their completed semester records with or without an active campaign.
--
-- Academic Preservation Rule:
-- student_profile_id uses ON DELETE RESTRICT to prevent accidental cascading
-- destruction of semester grades and tabulation histories.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_semester_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES public.aiml_student_profiles(id) ON DELETE RESTRICT,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  cumulative_cgpa NUMERIC(4,2) NOT NULL CHECK (cumulative_cgpa >= 0.00 AND cumulative_cgpa <= 10.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT uq_aiml_student_semester UNIQUE (student_profile_id, semester_number)
);

COMMENT ON TABLE public.aiml_semester_records IS 'Semester academic records. Cumulative CGPA is recorded for completed semesters (1 through 8). Not calculated via simple average.';


-- ----------------------------------------------------------------------------
-- TABLE 4: aiml_update_campaigns
-- Purpose: Academic update campaigns initiated by the HOD.
--
-- Approved Academic Mapping (Latest Completed Semester):
-- Maximum completed semester formula: ((current_year - 1) * 2) + current_term - 1
-- Second Year Term 1 (2-1) -> Semester 2
-- Second Year Term 2 (2-2) -> Semester 3
-- Third Year Term 1  (3-1) -> Semester 4
-- Third Year Term 2  (3-2) -> Semester 5
-- Fourth Year Term 1 (4-1) -> Semester 6
-- Fourth Year Term 2 (4-2) -> Semester 7
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_update_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  target_year INTEGER NOT NULL CHECK (target_year BETWEEN 2 AND 4),
  target_term INTEGER NOT NULL CHECK (target_term BETWEEN 1 AND 2),
  target_semester INTEGER NOT NULL CHECK (target_semester BETWEEN 1 AND 8),
  instructions TEXT,
  deadline DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT chk_campaign_academic_mapping CHECK (
    (target_year = 2 AND target_term = 1 AND target_semester = 2) OR
    (target_year = 2 AND target_term = 2 AND target_semester = 3) OR
    (target_year = 3 AND target_term = 1 AND target_semester = 4) OR
    (target_year = 3 AND target_term = 2 AND target_semester = 5) OR
    (target_year = 4 AND target_term = 1 AND target_semester = 6) OR
    (target_year = 4 AND target_term = 2 AND target_semester = 7)
  )
);

COMMENT ON TABLE public.aiml_update_campaigns IS 'HOD-initiated update requests for specific target academic year, term, and latest completed semester CGPA records.';


-- ----------------------------------------------------------------------------
-- TABLE 5: aiml_campaign_students
-- Purpose: Submission tracking per student for each active campaign.
--
-- Submission Rules:
-- 1. Status is automatically set to "submitted" if student already possesses a valid CGPA record.
-- 2. Status transitions from "pending" to "submitted" automatically upon saving semester record.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_campaign_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.aiml_update_campaigns(id) ON DELETE RESTRICT,
  student_profile_id UUID NOT NULL REFERENCES public.aiml_student_profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT uq_aiml_campaign_student UNIQUE (campaign_id, student_profile_id)
);

COMMENT ON TABLE public.aiml_campaign_students IS 'Tracks pending and submitted student updates per campaign. Automatically checks existing CGPA records on creation.';


-- ----------------------------------------------------------------------------
-- TABLE 6: aiml_audit_logs
-- Purpose: Non-destructive, immutable audit trail for sensitive actions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.aiml_audit_logs IS 'System audit log for administrative oversight. Never logs credentials or secrets.';


-- ============================================================================
-- SECTION 3: HARDENED TRIGGERS & VALIDATION FUNCTIONS (SET search_path = '')
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 1: public.aiml_touch_updated_at()
-- Automatically updates updated_at timestamp.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_touch_updated_at() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 2: public.aiml_protect_student_profile_fields()
-- Enforces that students cannot modify administrative and identity fields:
-- id, user_id, register_number, is_active, must_change_password, is_profile_completed, created_at.
--
-- Student Academic Standing Lock:
-- Before profile completion (OLD.is_profile_completed = false):
--   Student can select their academic year (2-4) and term (1-2) during initial onboarding.
-- After profile completion (OLD.is_profile_completed = true):
--   current_year and current_term are LOCKED against student modification.
--   Only an authenticated HOD or trusted backend service_role can modify academic standing.
--
-- Students remain permitted to update personal details and academic percentages:
-- full_name, email, phone_number, location, profile_photo_path, qualification_type,
-- ssc_percentage, intermediate_percentage.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_protect_student_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If caller is not HOD and not trusted service_role:
  IF NOT (public.aiml_is_hod() OR public.aiml_is_service_role()) THEN
    -- 1. Forbid altering core identity, onboarding flags, and account status attributes
    IF (OLD.id IS DISTINCT FROM NEW.id) OR
       (OLD.user_id IS DISTINCT FROM NEW.user_id) OR
       (OLD.register_number IS DISTINCT FROM NEW.register_number) OR
       (OLD.is_active IS DISTINCT FROM NEW.is_active) OR
       (OLD.must_change_password IS DISTINCT FROM NEW.must_change_password) OR
       (OLD.is_profile_completed IS DISTINCT FROM NEW.is_profile_completed) OR
       (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
      RAISE EXCEPTION 'Core identity, onboarding flags (must_change_password, is_profile_completed), and account status attributes cannot be modified by students.';
    END IF;

    -- 2. Lock academic standing (current_year, current_term) after profile completion
    IF OLD.is_profile_completed = true THEN
      IF (OLD.current_year IS DISTINCT FROM NEW.current_year) OR
         (OLD.current_term IS DISTINCT FROM NEW.current_term) THEN
        RAISE EXCEPTION 'Academic standing (current_year, current_term) is locked after profile completion. Contact HOD to update academic standing.';
      END IF;
    END IF;

    -- 3. Photo path ownership protection:
    -- If a student updates profile_photo_path, the path must be located in their own authenticated UID folder
    -- Path format requirement: {auth.uid()}/... or NULL
    IF NEW.profile_photo_path IS NOT NULL AND NEW.profile_photo_path IS DISTINCT FROM OLD.profile_photo_path THEN
      IF NOT (NEW.profile_photo_path LIKE (auth.uid()::text || '/%') OR NEW.profile_photo_path = '') THEN
        RAISE EXCEPTION 'Security violation: Profile photo path must reside in your own authenticated user folder.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_protect_student_profile_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_protect_student_profile_fields() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 3: public.aiml_validate_semester_eligibility()
-- Enforces that:
-- 1. Profile must be active and have COMPLETED onboarding (is_profile_completed = true).
-- 2. Null-safe student ownership check (auth.uid() IS DISTINCT FROM v_profile_user_id).
-- 3. Structural fields (id, student_profile_id, semester_number, created_at) are immutable.
-- 4. Only COMPLETED semesters may be recorded. Ongoing or future semesters are rejected.
--    Formula: Maximum completed semester = ((current_year - 1) * 2) + current_term - 1.
--    This rule is strictly enforced on all student academic submissions including backend-mediated writes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_validate_semester_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_year pg_catalog.int4;
  v_current_term pg_catalog.int4;
  v_profile_user_id pg_catalog.uuid;
  v_is_active pg_catalog.bool;
  v_is_profile_completed pg_catalog.bool;
  v_max_completed_semester pg_catalog.int4;
BEGIN
  -- Structural field protection on update for non-HOD and non-service_role callers
  IF TG_OP = 'UPDATE' AND NOT (public.aiml_is_hod() OR public.aiml_is_service_role()) THEN
    IF (OLD.id IS DISTINCT FROM NEW.id) OR
       (OLD.student_profile_id IS DISTINCT FROM NEW.student_profile_id) OR
       (OLD.semester_number IS DISTINCT FROM NEW.semester_number) OR
       (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
      RAISE EXCEPTION 'Semester record structural attributes (id, student_profile_id, semester_number, created_at) cannot be modified or transferred.';
    END IF;
  END IF;

  -- Retrieve student profile details including active status, completion flag, and academic standing
  SELECT current_year, current_term, user_id, is_active, is_profile_completed
  INTO v_current_year, v_current_term, v_profile_user_id, v_is_active, v_is_profile_completed
  FROM public.aiml_student_profiles
  WHERE id = NEW.student_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced student profile % does not exist.', NEW.student_profile_id;
  END IF;

  -- Reject academic updates if student profile is inactive
  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Academic record updates are blocked because student profile % is inactive.', NEW.student_profile_id;
  END IF;

  -- Reject semester record submissions if student profile has not completed onboarding
  IF NOT v_is_profile_completed THEN
    RAISE EXCEPTION 'Academic record submission is blocked: You must complete your student profile onboarding before submitting semester CGPA records.';
  END IF;

  -- Verify student ownership for normal authenticated callers:
  -- Normal students can modify only their own records.
  -- Null-safe verification: auth.uid() IS DISTINCT FROM v_profile_user_id.
  -- Trusted service_role and HOD bypass ownership checks without failing when auth.uid() is NULL.
  IF NOT (public.aiml_is_hod() OR public.aiml_is_service_role()) AND (auth.uid() IS DISTINCT FROM v_profile_user_id) THEN
    RAISE EXCEPTION 'Access denied: You can only insert or update semester records for your own student profile.';
  END IF;

  -- Profile must have completed year/term onboarding before semester records can be added
  IF v_current_year IS NULL OR v_current_term IS NULL THEN
    RAISE EXCEPTION 'Please complete your academic profile (academic year and term) before submitting semester records.';
  END IF;

  -- Completed semester validation:
  -- Enforced strictly on all student academic submissions (including backend-mediated writes)
  v_max_completed_semester := ((v_current_year - 1) * 2) + v_current_term - 1;

  IF NEW.semester_number > v_max_completed_semester THEN
    RAISE EXCEPTION 'Semester % is an ongoing or future semester. Only completed semesters (up to Semester %) may be recorded based on student standing (Year % Term %).',
      NEW.semester_number, v_max_completed_semester, v_current_year, v_current_term;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_validate_semester_eligibility() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_validate_semester_eligibility() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 4: public.aiml_sync_campaign_submission()
-- Automatically marks active matching campaigns as 'submitted' when a semester
-- record is saved. Matches target_semester, target_year, and target_term to prevent
-- cross-term collisions.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_sync_campaign_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_year pg_catalog.int4;
  v_student_term pg_catalog.int4;
BEGIN
  -- Retrieve student's current academic year and term
  SELECT current_year, current_term
  INTO v_student_year, v_student_term
  FROM public.aiml_student_profiles
  WHERE id = NEW.student_profile_id;

  -- Automatically update matching active campaign statuses for this student
  -- Must match target_semester, target_year, AND target_term
  UPDATE public.aiml_campaign_students cs
  SET status = 'submitted',
      submitted_at = pg_catalog.now()
  FROM public.aiml_update_campaigns c
  WHERE cs.campaign_id = c.id
    AND cs.student_profile_id = NEW.student_profile_id
    AND c.target_semester = NEW.semester_number
    AND c.target_year = v_student_year
    AND c.target_term = v_student_term
    AND c.is_active = true
    AND cs.status = 'pending';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_sync_campaign_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_sync_campaign_submission() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 5: public.aiml_check_existing_cgpa_on_campaign_join()
-- When a student is enrolled in a campaign, verifies whether they are strictly eligible
-- and whether they already have an existing valid CGPA record matching
-- target_year, target_term, AND target_semester.
--
-- Strict Rejection Rules:
-- 1. Campaign must exist and be active.
-- 2. Student profile must exist, be active, and be completed (is_profile_completed = true).
-- 3. Student's current_year AND current_term must match campaign target_year and target_term.
-- If any condition is violated, the enrollment INSERT is rejected with an exception.
--
-- Status Assignment:
-- - Existing matching CGPA -> 'submitted'
-- - No matching CGPA -> 'pending'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_check_existing_cgpa_on_campaign_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_campaign_active pg_catalog.bool;
  v_target_year pg_catalog.int4;
  v_target_term pg_catalog.int4;
  v_target_semester pg_catalog.int4;
  v_student_active pg_catalog.bool;
  v_student_completed pg_catalog.bool;
  v_student_year pg_catalog.int4;
  v_student_term pg_catalog.int4;
  v_has_valid_cgpa pg_catalog.bool;
BEGIN
  -- 1. Retrieve campaign attributes
  SELECT is_active, target_year, target_term, target_semester
  INTO v_campaign_active, v_target_year, v_target_term, v_target_semester
  FROM public.aiml_update_campaigns
  WHERE id = NEW.campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign enrollment rejected: Referenced campaign % does not exist.', NEW.campaign_id;
  END IF;

  IF NOT v_campaign_active THEN
    RAISE EXCEPTION 'Campaign enrollment rejected: Campaign % is inactive.', NEW.campaign_id;
  END IF;

  -- 2. Retrieve student profile attributes
  SELECT is_active, is_profile_completed, current_year, current_term
  INTO v_student_active, v_student_completed, v_student_year, v_student_term
  FROM public.aiml_student_profiles
  WHERE id = NEW.student_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign enrollment rejected: Referenced student profile % does not exist.', NEW.student_profile_id;
  END IF;

  IF NOT v_student_active THEN
    RAISE EXCEPTION 'Campaign enrollment rejected: Student profile % is inactive.', NEW.student_profile_id;
  END IF;

  IF NOT v_student_completed THEN
    RAISE EXCEPTION 'Campaign enrollment rejected: Student profile % has not completed onboarding.', NEW.student_profile_id;
  END IF;

  -- 3. Verify academic year and term match
  IF (v_student_year IS DISTINCT FROM v_target_year) OR (v_student_term IS DISTINCT FROM v_target_term) THEN
    RAISE EXCEPTION 'Campaign enrollment rejected: Student academic standing (Year % Term %) does not match campaign target (Year % Term %).',
      v_student_year, v_student_term, v_target_year, v_target_term;
  END IF;

  -- 4. Check whether a valid semester record exists for target_semester
  -- Automatic CGPA-based status calculation:
  -- Status is strictly derived from the existence of a valid matching CGPA record.
  -- This prevents manual status tampering or bypassing automatic submission tracking.
  SELECT EXISTS (
    SELECT 1
    FROM public.aiml_semester_records sr
    WHERE sr.student_profile_id = NEW.student_profile_id
      AND sr.semester_number = v_target_semester
      AND sr.cumulative_cgpa IS NOT NULL
  ) INTO v_has_valid_cgpa;

  IF v_has_valid_cgpa THEN
    NEW.status := 'submitted';
    IF TG_OP = 'INSERT' OR OLD.submitted_at IS NULL THEN
      NEW.submitted_at := pg_catalog.now();
    ELSE
      NEW.submitted_at := OLD.submitted_at;
    END IF;
  ELSE
    NEW.status := 'pending';
    NEW.submitted_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_check_existing_cgpa_on_campaign_join() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_check_existing_cgpa_on_campaign_join() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 6: public.aiml_auto_enroll_campaign_students()
-- Automatically creates campaign tracking records for all eligible active and
-- completed students whose current_year AND current_term match the campaign's
-- target_year and target_term when an active campaign is created.
-- Fully transactional and idempotent (ON CONFLICT DO NOTHING).
--
-- Campaign Target Immutability Protection:
-- If an existing campaign is updated, its target_year, target_term, and target_semester
-- cannot be modified after creation to prevent stale assignments or corrupt submission histories.
-- To target a different cohort, HOD must create a new distinct campaign.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_auto_enroll_campaign_students()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent modification of campaign targeting attributes after creation
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.target_year IS DISTINCT FROM NEW.target_year) OR
       (OLD.target_term IS DISTINCT FROM NEW.target_term) OR
       (OLD.target_semester IS DISTINCT FROM NEW.target_semester) THEN
      RAISE EXCEPTION 'Campaign targeting attributes (target_year, target_term, target_semester) are immutable after creation. Please create a new campaign for a different cohort.';
    END IF;
  END IF;

  -- Automatically enroll active, completed students of matching target_year AND target_term
  IF NEW.is_active = true THEN
    INSERT INTO public.aiml_campaign_students (
      campaign_id,
      student_profile_id
    )
    SELECT
      NEW.id,
      p.id
    FROM public.aiml_student_profiles p
    WHERE p.current_year = NEW.target_year
      AND p.current_term = NEW.target_term
      AND p.is_active = true
      AND p.is_profile_completed = true
    ON CONFLICT (campaign_id, student_profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_auto_enroll_campaign_students() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_auto_enroll_campaign_students() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 7: public.aiml_enroll_student_in_active_campaigns()
-- Automatically enrolls an active, completed student into existing active campaigns
-- matching their current_year AND current_term when their student profile is inserted,
-- updated with academic standing, or marked completed (is_profile_completed = true).
-- Fully transactional and idempotent (ON CONFLICT DO NOTHING).
-- Existing CGPA pre-check is automatically invoked via trg_aiml_campaign_students_existing_cgpa.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_enroll_student_in_active_campaigns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Enroll student into all matching active campaigns if profile is active and profile is completed
  IF NEW.is_active = true AND NEW.is_profile_completed = true AND NEW.current_year IS NOT NULL AND NEW.current_term IS NOT NULL THEN
    INSERT INTO public.aiml_campaign_students (
      campaign_id,
      student_profile_id
    )
    SELECT
      c.id,
      NEW.id
    FROM public.aiml_update_campaigns c
    WHERE c.target_year = NEW.current_year
      AND c.target_term = NEW.current_term
      AND c.is_active = true
    ON CONFLICT (campaign_id, student_profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_enroll_student_in_active_campaigns() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_enroll_student_in_active_campaigns() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 7: public.aiml_complete_student_profile()
-- Secure server-mediated RPC function enabling transition of is_profile_completed
-- to true only after validating all mandatory onboarding profile fields:
-- 1. full_name (non-empty)
-- 2. email (non-empty, basic format)
-- 3. phone_number (non-empty)
-- 4. location (non-empty)
-- 5. current_year (between 2 and 4)
-- 6. current_term (between 1 and 2)
-- 7. qualification_type ('intermediate' or 'diploma')
-- 8. ssc_percentage (0.00 to 100.00)
-- 9. intermediate_percentage (0.00 to 100.00)
--
-- Note: Does NOT require admission_year. Profile photo remains optional.
-- Security: Revoked from PUBLIC, anon, and authenticated. Executable strictly by service_role.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_complete_student_profile(p_student_id UUID)
RETURNS public.aiml_student_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.aiml_student_profiles;
BEGIN
  -- Verify caller is trusted service_role or HOD
  IF NOT (public.aiml_is_service_role() OR public.aiml_is_hod()) THEN
    RAISE EXCEPTION 'Access denied: Profile completion must be processed via the verified backend service.';
  END IF;

  SELECT * INTO v_profile
  FROM public.aiml_student_profiles
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile % not found.', p_student_id;
  END IF;

  -- Mandatory security gate: Initial password must be changed before profile completion
  IF v_profile.must_change_password IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Please change your initial password before completing your student profile.';
  END IF;

  -- Validate mandatory onboarding fields:
  -- 1. Full Name
  IF v_profile.full_name IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.full_name)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Full Name is required.';
  END IF;

  -- 2. Email (non-empty & basic email format: user@domain.tld)
  IF v_profile.email IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.email)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Official Email is required.';
  END IF;

  IF NOT (v_profile.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Please provide a valid email address format (e.g. user@domain.com).';
  END IF;

  -- 3. Phone Number
  IF v_profile.phone_number IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.phone_number)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Phone Number is required.';
  END IF;

  -- 4. Location
  IF v_profile.location IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.location)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Location is required.';
  END IF;

  -- 5. Academic Year (Years 2, 3, 4)
  IF v_profile.current_year IS NULL OR v_profile.current_year NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Valid Academic Year (2, 3, or 4) is required.';
  END IF;

  -- 6. Academic Term (Terms 1, 2)
  IF v_profile.current_term IS NULL OR v_profile.current_term NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Valid Academic Term (1 or 2) is required.';
  END IF;

  -- 7. Qualification Type (intermediate or diploma)
  IF v_profile.qualification_type IS NULL OR v_profile.qualification_type NOT IN ('intermediate', 'diploma') THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Valid Qualification Type (intermediate or diploma) is required.';
  END IF;

  -- 8. SSC Percentage (0.00 to 100.00)
  IF v_profile.ssc_percentage IS NULL OR v_profile.ssc_percentage < 0.00 OR v_profile.ssc_percentage > 100.00 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: SSC Percentage must be between 0.00 and 100.00.';
  END IF;

  -- 9. Intermediate/Diploma Percentage (0.00 to 100.00)
  IF v_profile.intermediate_percentage IS NULL OR v_profile.intermediate_percentage < 0.00 OR v_profile.intermediate_percentage > 100.00 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Intermediate/Diploma Percentage must be between 0.00 and 100.00.';
  END IF;

  UPDATE public.aiml_student_profiles
  SET is_profile_completed = true,
      updated_at = pg_catalog.now()
  WHERE id = p_student_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.aiml_complete_student_profile(UUID)
IS 'Secure backend service-role validated operation for marking student onboarding profile completed.';

REVOKE ALL ON FUNCTION public.aiml_complete_student_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aiml_complete_student_profile(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.aiml_complete_student_profile(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_complete_student_profile(UUID) TO service_role;


-- ----------------------------------------------------------------------------
-- Function 8: public.aiml_audit_log_trigger()
-- Records audit events for critical modifications without logging secrets.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_record_id pg_catalog.uuid;
  v_metadata pg_catalog.jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_metadata := pg_catalog.jsonb_build_object('operation', 'DELETE', 'table', TG_TABLE_NAME);
  ELSE
    v_record_id := NEW.id;
    v_metadata := pg_catalog.jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'updated_at', pg_catalog.now()
    );
  END IF;

  INSERT INTO public.aiml_audit_logs (
    actor_user_id,
    action,
    table_name,
    record_id,
    metadata
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_metadata
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_audit_log_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_audit_log_trigger() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 9: public.aiml_hod_update_student_academic_fields()
-- Secure HOD-only RPC function to update protected academic milestones.
-- Supports 2nd, 3rd, and 4th academic years and terms 1-2.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_hod_update_student_academic_fields(
  p_student_id UUID,
  p_current_year INTEGER,
  p_current_term INTEGER,
  p_admission_year INTEGER DEFAULT NULL,
  p_register_number TEXT DEFAULT NULL
)
RETURNS public.aiml_student_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_profile public.aiml_student_profiles;
BEGIN
  -- Strict verification: only authenticated HOD or trusted service_role can invoke
  IF NOT (public.aiml_is_hod() OR public.aiml_is_service_role()) THEN
    RAISE EXCEPTION 'Unauthorized: Only an authenticated HOD or trusted service_role can update academic milestones.';
  END IF;

  -- Explicitly reject NULL parameters for current_year and current_term
  IF p_current_year IS NULL THEN
    RAISE EXCEPTION 'current_year cannot be NULL. Valid academic year must be provided.';
  END IF;

  IF p_current_term IS NULL THEN
    RAISE EXCEPTION 'current_term cannot be NULL. Valid academic term must be provided.';
  END IF;

  -- Validate range boundaries (Years 2-4, Terms 1-2)
  IF p_current_year NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'current_year must be between 2 and 4 (Second Year to Fourth Year).';
  END IF;

  IF p_current_term NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'current_term must be between 1 and 2.';
  END IF;

  UPDATE public.aiml_student_profiles
  SET
    current_year = p_current_year,
    current_term = p_current_term,
    admission_year = COALESCE(p_admission_year, admission_year),
    register_number = COALESCE(p_register_number, register_number),
    updated_at = pg_catalog.now()
  WHERE id = p_student_id
  RETURNING * INTO v_updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile with id % not found.', p_student_id;
  END IF;

  RETURN v_updated_profile;
END;
$$;

COMMENT ON FUNCTION public.aiml_hod_update_student_academic_fields(UUID, INTEGER, INTEGER, INTEGER, TEXT)
IS 'Secure HOD-only operation for updating student academic year, term, and registration milestones.';

REVOKE ALL ON FUNCTION public.aiml_hod_update_student_academic_fields(UUID, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aiml_hod_update_student_academic_fields(UUID, INTEGER, INTEGER, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.aiml_hod_update_student_academic_fields(UUID, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated, service_role;


-- ============================================================================
-- SECTION 4: ATTACH TRIGGERS TO TABLES (SAFE RERUN IDEMPOTENCE)
-- ============================================================================

-- Profile timestamps and field lock
DROP TRIGGER IF EXISTS trg_aiml_student_profiles_updated_at ON public.aiml_student_profiles;
CREATE TRIGGER trg_aiml_student_profiles_updated_at
BEFORE UPDATE ON public.aiml_student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.aiml_touch_updated_at();

DROP TRIGGER IF EXISTS trg_aiml_student_profiles_protect ON public.aiml_student_profiles;
CREATE TRIGGER trg_aiml_student_profiles_protect
BEFORE UPDATE ON public.aiml_student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.aiml_protect_student_profile_fields();

-- Semester records timestamps, eligibility check, and campaign sync
DROP TRIGGER IF EXISTS trg_aiml_semester_records_updated_at ON public.aiml_semester_records;
CREATE TRIGGER trg_aiml_semester_records_updated_at
BEFORE UPDATE ON public.aiml_semester_records
FOR EACH ROW
EXECUTE FUNCTION public.aiml_touch_updated_at();

DROP TRIGGER IF EXISTS trg_aiml_semester_records_eligibility ON public.aiml_semester_records;
CREATE TRIGGER trg_aiml_semester_records_eligibility
BEFORE INSERT OR UPDATE ON public.aiml_semester_records
FOR EACH ROW
EXECUTE FUNCTION public.aiml_validate_semester_eligibility();

DROP TRIGGER IF EXISTS trg_aiml_semester_records_campaign_sync ON public.aiml_semester_records;
CREATE TRIGGER trg_aiml_semester_records_campaign_sync
AFTER INSERT OR UPDATE ON public.aiml_semester_records
FOR EACH ROW
EXECUTE FUNCTION public.aiml_sync_campaign_submission();

-- Campaign student initialization and update validation check for existing CGPA
DROP TRIGGER IF EXISTS trg_aiml_campaign_students_existing_cgpa ON public.aiml_campaign_students;
CREATE TRIGGER trg_aiml_campaign_students_existing_cgpa
BEFORE INSERT OR UPDATE ON public.aiml_campaign_students
FOR EACH ROW
EXECUTE FUNCTION public.aiml_check_existing_cgpa_on_campaign_join();

-- Automatic enrollment trigger and target immutability check on campaign creation and update
DROP TRIGGER IF EXISTS trg_aiml_campaigns_auto_enroll ON public.aiml_update_campaigns;
CREATE TRIGGER trg_aiml_campaigns_auto_enroll
AFTER INSERT OR UPDATE ON public.aiml_update_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.aiml_auto_enroll_campaign_students();

-- Automatic enrollment trigger for late student onboarding / profile academic standing updates
DROP TRIGGER IF EXISTS trg_aiml_profiles_auto_enroll_campaigns ON public.aiml_student_profiles;
CREATE TRIGGER trg_aiml_profiles_auto_enroll_campaigns
AFTER INSERT OR UPDATE OF current_year, current_term, is_profile_completed, is_active ON public.aiml_student_profiles
FOR EACH ROW
WHEN (NEW.is_active = true AND NEW.is_profile_completed = true AND NEW.current_year IS NOT NULL AND NEW.current_term IS NOT NULL)
EXECUTE FUNCTION public.aiml_enroll_student_in_active_campaigns();

-- Audit logging on sensitive records
DROP TRIGGER IF EXISTS trg_aiml_audit_profiles ON public.aiml_student_profiles;
CREATE TRIGGER trg_aiml_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.aiml_student_profiles
FOR EACH ROW
EXECUTE FUNCTION public.aiml_audit_log_trigger();

DROP TRIGGER IF EXISTS trg_aiml_audit_semesters ON public.aiml_semester_records;
CREATE TRIGGER trg_aiml_audit_semesters
AFTER INSERT OR UPDATE OR DELETE ON public.aiml_semester_records
FOR EACH ROW
EXECUTE FUNCTION public.aiml_audit_log_trigger();


-- ============================================================================
-- SECTION 5: PERFORMANCE INDEXES (CAPACITY: 400 - 1,000+ STUDENTS)
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_user_id
  ON public.aiml_student_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_register_number
  ON public.aiml_student_profiles(register_number);

CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_year_term
  ON public.aiml_student_profiles(current_year, current_term);

CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_ssc_percentage
  ON public.aiml_student_profiles(ssc_percentage);

CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_intermediate_percentage
  ON public.aiml_student_profiles(intermediate_percentage);

CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_is_active
  ON public.aiml_student_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_completed
  ON public.aiml_student_profiles(is_profile_completed);

-- Semester records indexes
CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_student_profile_id
  ON public.aiml_semester_records(student_profile_id);

CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_semester_number
  ON public.aiml_semester_records(semester_number);

CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_cumulative_cgpa
  ON public.aiml_semester_records(cumulative_cgpa);

CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_lookup
  ON public.aiml_semester_records(student_profile_id, semester_number);

-- Campaigns indexes (Multi-dimensional indexing by target_year, target_term, and target_semester)
CREATE INDEX IF NOT EXISTS idx_aiml_update_campaigns_lookup
  ON public.aiml_update_campaigns(target_year, target_term, target_semester, is_active);

-- Campaign students indexes
CREATE INDEX IF NOT EXISTS idx_aiml_campaign_students_campaign_id
  ON public.aiml_campaign_students(campaign_id);

CREATE INDEX IF NOT EXISTS idx_aiml_campaign_students_student_profile_id
  ON public.aiml_campaign_students(student_profile_id);

CREATE INDEX IF NOT EXISTS idx_aiml_campaign_students_status
  ON public.aiml_campaign_students(status);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_aiml_audit_logs_actor
  ON public.aiml_audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aiml_audit_logs_table_record
  ON public.aiml_audit_logs(table_name, record_id);


-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) & IDEMPOTENT POLICIES
-- ============================================================================

-- Enable RLS on all six application tables
ALTER TABLE public.aiml_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aiml_student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aiml_semester_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aiml_update_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aiml_campaign_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aiml_audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLICIES: aiml_user_roles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_roles_student_read_own" ON public.aiml_user_roles;
CREATE POLICY "aiml_roles_student_read_own"
  ON public.aiml_user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "aiml_roles_hod_read_all" ON public.aiml_user_roles;
CREATE POLICY "aiml_roles_hod_read_all"
  ON public.aiml_user_roles
  FOR SELECT
  TO authenticated
  USING (public.aiml_is_hod());

-- ----------------------------------------------------------------------------
-- POLICIES: aiml_student_profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_profiles_student_read_own" ON public.aiml_student_profiles;
CREATE POLICY "aiml_profiles_student_read_own"
  ON public.aiml_student_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

DROP POLICY IF EXISTS "aiml_profiles_student_update_own" ON public.aiml_student_profiles;
CREATE POLICY "aiml_profiles_student_update_own"
  ON public.aiml_student_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_active = true)
  WITH CHECK (user_id = auth.uid() AND is_active = true);

DROP POLICY IF EXISTS "aiml_profiles_hod_read_all" ON public.aiml_student_profiles;
CREATE POLICY "aiml_profiles_hod_read_all"
  ON public.aiml_student_profiles
  FOR SELECT
  TO authenticated
  USING (public.aiml_is_hod());

DROP POLICY IF EXISTS "aiml_profiles_hod_manage_all" ON public.aiml_student_profiles;
CREATE POLICY "aiml_profiles_hod_manage_all"
  ON public.aiml_student_profiles
  FOR ALL
  TO authenticated
  USING (public.aiml_is_hod())
  WITH CHECK (public.aiml_is_hod());

-- ----------------------------------------------------------------------------
-- POLICIES: aiml_semester_records
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_semesters_student_read_own" ON public.aiml_semester_records;
CREATE POLICY "aiml_semesters_student_read_own"
  ON public.aiml_semester_records
  FOR SELECT
  TO authenticated
  USING (
    student_profile_id IN (
      SELECT id FROM public.aiml_student_profiles WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_semesters_student_insert_own" ON public.aiml_semester_records;
CREATE POLICY "aiml_semesters_student_insert_own"
  ON public.aiml_semester_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_profile_id IN (
      SELECT id FROM public.aiml_student_profiles WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_semesters_student_update_own" ON public.aiml_semester_records;
CREATE POLICY "aiml_semesters_student_update_own"
  ON public.aiml_semester_records
  FOR UPDATE
  TO authenticated
  USING (
    student_profile_id IN (
      SELECT id FROM public.aiml_student_profiles WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    student_profile_id IN (
      SELECT id FROM public.aiml_student_profiles WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_semesters_hod_manage_all" ON public.aiml_semester_records;
CREATE POLICY "aiml_semesters_hod_manage_all"
  ON public.aiml_semester_records
  FOR ALL
  TO authenticated
  USING (public.aiml_is_hod())
  WITH CHECK (public.aiml_is_hod());

-- ----------------------------------------------------------------------------
-- POLICIES: aiml_update_campaigns
-- Student visibility is strictly scoped to campaigns that:
-- 1. Are active.
-- 2. Student profile is active AND completed (is_profile_completed = true).
-- 3. Match the student's academic year and term.
-- 4. Have an existing assignment in aiml_campaign_students for this student.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_campaigns_student_read_active" ON public.aiml_update_campaigns;
CREATE POLICY "aiml_campaigns_student_read_active"
  ON public.aiml_update_campaigns
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.aiml_student_profiles p
      JOIN public.aiml_campaign_students cs ON cs.student_profile_id = p.id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND p.is_profile_completed = true
        AND p.current_year = public.aiml_update_campaigns.target_year
        AND p.current_term = public.aiml_update_campaigns.target_term
        AND cs.campaign_id = public.aiml_update_campaigns.id
    )
  );

DROP POLICY IF EXISTS "aiml_campaigns_hod_manage_all" ON public.aiml_update_campaigns;
CREATE POLICY "aiml_campaigns_hod_manage_all"
  ON public.aiml_update_campaigns
  FOR ALL
  TO authenticated
  USING (public.aiml_is_hod())
  WITH CHECK (public.aiml_is_hod());

-- ----------------------------------------------------------------------------
-- POLICIES: aiml_campaign_students
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_campaign_students_read_own" ON public.aiml_campaign_students;
CREATE POLICY "aiml_campaign_students_read_own"
  ON public.aiml_campaign_students
  FOR SELECT
  TO authenticated
  USING (
    student_profile_id IN (
      SELECT id FROM public.aiml_student_profiles
      WHERE user_id = auth.uid()
        AND is_active = true
        AND is_profile_completed = true
    )
  );

DROP POLICY IF EXISTS "aiml_campaign_students_hod_manage_all" ON public.aiml_campaign_students;
CREATE POLICY "aiml_campaign_students_hod_manage_all"
  ON public.aiml_campaign_students
  FOR ALL
  TO authenticated
  USING (public.aiml_is_hod())
  WITH CHECK (public.aiml_is_hod());

-- ----------------------------------------------------------------------------
-- POLICIES: aiml_audit_logs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_audit_hod_read_all" ON public.aiml_audit_logs;
CREATE POLICY "aiml_audit_hod_read_all"
  ON public.aiml_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.aiml_is_hod());

-- Students are explicitly denied access (no student policy created)


-- ============================================================================
-- SECTION 7: STORAGE POLICIES (aiml-student-photos BUCKET)
-- Bucket is preserved private; access is governed via user-owned folder paths.
-- Path format: {auth.uid()}/{filename}
-- ============================================================================

DROP POLICY IF EXISTS "aiml_photos_student_upload" ON storage.objects;
CREATE POLICY "aiml_photos_student_upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'aiml-student-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.aiml_student_profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_photos_student_read_own" ON storage.objects;
CREATE POLICY "aiml_photos_student_read_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'aiml-student-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.aiml_student_profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_photos_student_update_own" ON storage.objects;
CREATE POLICY "aiml_photos_student_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'aiml-student-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.aiml_student_profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'aiml-student-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.aiml_student_profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_photos_student_delete_own" ON storage.objects;
CREATE POLICY "aiml_photos_student_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'aiml-student-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.aiml_student_profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "aiml_photos_hod_read_all" ON storage.objects;
CREATE POLICY "aiml_photos_hod_read_all"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'aiml-student-photos'
    AND public.aiml_is_hod()
  );


-- ============================================================================
-- SECTION 8: ROLE GRANTS & COLUMN-LEVEL PRIVILEGE SEPARATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table Grants: aiml_student_profiles
-- Column-level privilege separation:
-- Authenticated users can SELECT and INSERT their profile.
-- Students complete their own profile: personal, contact, qualification, and
-- academic year/term milestones (Years 2-4, Terms 1-2).
-- Core identity attributes (id, user_id, register_number, is_active, created_at)
-- AND mandatory onboarding flags (must_change_password, is_profile_completed)
-- are strictly excluded from student UPDATE grants and remain backend-controlled.
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.aiml_student_profiles TO authenticated;
REVOKE UPDATE ON public.aiml_student_profiles FROM authenticated;
GRANT UPDATE (
  full_name,
  email,
  phone_number,
  location,
  profile_photo_path,
  qualification_type,
  ssc_percentage,
  intermediate_percentage,
  admission_year,
  current_year,
  current_term
) ON public.aiml_student_profiles TO authenticated;

-- ----------------------------------------------------------------------------
-- Table Grants: aiml_semester_records
-- Column-level privilege separation:
-- Authenticated users can SELECT.
-- INSERT is restricted strictly to student_profile_id, semester_number, cumulative_cgpa.
-- UPDATE is restricted strictly to cumulative_cgpa.
-- System structural attributes (id, created_at, updated_at) are generated automatically.
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.aiml_semester_records TO authenticated;
REVOKE INSERT ON public.aiml_semester_records FROM authenticated;
GRANT INSERT (
  student_profile_id,
  semester_number,
  cumulative_cgpa
) ON public.aiml_semester_records TO authenticated;

REVOKE UPDATE ON public.aiml_semester_records FROM authenticated;
GRANT UPDATE (
  cumulative_cgpa
) ON public.aiml_semester_records TO authenticated;

-- General read grants governed by RLS
GRANT SELECT ON public.aiml_user_roles TO authenticated;
GRANT SELECT ON public.aiml_audit_logs TO authenticated;

-- ----------------------------------------------------------------------------
-- Campaign Table Grants: Explicit CRUD permissions under RLS
-- Explicitly revoking ALL privileges prevents authenticated users from TRUNCATE,
-- TRIGGER, or REFERENCES operations, while granting standard DML subject to RLS.
-- ----------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON public.aiml_update_campaigns FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aiml_update_campaigns TO authenticated;

REVOKE ALL PRIVILEGES ON public.aiml_campaign_students FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aiml_campaign_students TO authenticated;

-- Extended administrative grants for service_role
GRANT ALL ON public.aiml_user_roles TO service_role;
GRANT ALL ON public.aiml_student_profiles TO service_role;
GRANT ALL ON public.aiml_semester_records TO service_role;
GRANT ALL ON public.aiml_update_campaigns TO service_role;
GRANT ALL ON public.aiml_campaign_students TO service_role;
GRANT ALL ON public.aiml_audit_logs TO service_role;

-- End of migration 001_aiml_department_schema.sql
