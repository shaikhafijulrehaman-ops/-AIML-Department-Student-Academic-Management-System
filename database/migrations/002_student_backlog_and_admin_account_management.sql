-- ============================================================================
-- AIML DEPARTMENT STUDENT ACADEMIC MANAGEMENT SYSTEM
-- MIGRATION 002: Student Backlog Tracking & Administrative Account Management
-- DVR & Dr. HS MIC College of Technology
-- ============================================================================

-- 1. Safely add has_backlogs and backlog_count columns to aiml_student_profiles
ALTER TABLE public.aiml_student_profiles 
  ADD COLUMN IF NOT EXISTS has_backlogs BOOLEAN DEFAULT NULL;

ALTER TABLE public.aiml_student_profiles 
  ADD COLUMN IF NOT EXISTS backlog_count INTEGER DEFAULT NULL;

-- 2. Add consistency constraint for backlog data:
-- - Both can be NULL (for legacy profiles where details have not been collected yet)
-- - If has_backlogs is false -> backlog_count must be 0
-- - If has_backlogs is true -> backlog_count must be >= 1 (positive whole number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_aiml_student_backlogs'
  ) THEN
    ALTER TABLE public.aiml_student_profiles
      ADD CONSTRAINT chk_aiml_student_backlogs
      CHECK (
        (has_backlogs IS NULL AND backlog_count IS NULL) OR
        (has_backlogs = false AND backlog_count = 0) OR
        (has_backlogs = true AND backlog_count >= 1)
      );
  END IF;
END $$;

-- 3. Create index for fast directory filtering on backlog status
CREATE INDEX IF NOT EXISTS idx_aiml_student_profiles_backlogs
  ON public.aiml_student_profiles(has_backlogs, backlog_count);

-- 4. Update aiml_complete_student_profile function to enforce backlog question for new completions
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

  -- 1. Full Name
  IF v_profile.full_name IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.full_name)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Full Name is required.';
  END IF;

  -- 2. Email
  IF v_profile.email IS NULL OR v_profile.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Cannot mark profile completed: A valid Email address is required.';
  END IF;

  -- 3. Phone Number
  IF v_profile.phone_number IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.phone_number)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Contact Phone Number is required.';
  END IF;

  -- 4. Location
  IF v_profile.location IS NULL OR pg_catalog.length(pg_catalog.btrim(v_profile.location)) = 0 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Residential Location is required.';
  END IF;

  -- 5. Current Year (2 to 4, or 1 to 4)
  IF v_profile.current_year IS NULL OR v_profile.current_year < 1 OR v_profile.current_year > 4 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Academic Year must be between 1 and 4.';
  END IF;

  -- 6. Current Term (1 or 2)
  IF v_profile.current_term IS NULL OR v_profile.current_term < 1 OR v_profile.current_term > 2 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Academic Term must be 1 or 2.';
  END IF;

  -- 7. Qualification Type
  IF v_profile.qualification_type IS NULL OR v_profile.qualification_type NOT IN ('intermediate', 'diploma') THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Qualification Type must be intermediate or diploma.';
  END IF;

  -- 8. SSC Percentage (0.00 to 100.00)
  IF v_profile.ssc_percentage IS NULL OR v_profile.ssc_percentage < 0.00 OR v_profile.ssc_percentage > 100.00 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: SSC Percentage must be between 0.00 and 100.00.';
  END IF;

  -- 9. Intermediate/Diploma Percentage (0.00 to 100.00)
  IF v_profile.intermediate_percentage IS NULL OR v_profile.intermediate_percentage < 0.00 OR v_profile.intermediate_percentage > 100.00 THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Intermediate/Diploma Percentage must be between 0.00 and 100.00.';
  END IF;

  -- 10. Backlog Information (Mandatory for new profile completions)
  IF v_profile.has_backlogs IS NULL THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Backlog status (Yes/No) is required.';
  END IF;

  IF v_profile.has_backlogs = true AND (v_profile.backlog_count IS NULL OR v_profile.backlog_count < 1) THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Backlog count must be at least 1 when backlogs are reported.';
  END IF;

  IF v_profile.has_backlogs = false AND (v_profile.backlog_count IS NULL OR v_profile.backlog_count <> 0) THEN
    RAISE EXCEPTION 'Cannot mark profile completed: Backlog count must be 0 when no backlogs are reported.';
  END IF;

  -- Transition profile completion state
  UPDATE public.aiml_student_profiles
  SET is_profile_completed = true,
      updated_at = pg_catalog.now()
  WHERE id = p_student_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.aiml_complete_student_profile(UUID)
IS 'Secure backend service-role validated operation for marking student onboarding profile completed including backlog verification.';

REVOKE ALL ON FUNCTION public.aiml_complete_student_profile(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_complete_student_profile(UUID) TO service_role;

-- 5. Column-level privilege updates for authenticated student role on new and updated columns
GRANT UPDATE (
  has_backlogs,
  backlog_count,
  updated_at
) ON public.aiml_student_profiles TO authenticated;

-- Maintain full privileges for backend service_role
GRANT ALL ON public.aiml_student_profiles TO service_role;

