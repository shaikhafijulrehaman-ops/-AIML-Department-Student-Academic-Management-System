-- ============================================================================
-- MIGRATION 003: Allow Student Academic Standing Updates & Robust Semester CGPA
-- DVR & Dr. HS MIC College of Technology - AIML Department
--
-- Purpose:
-- 1. Updates aiml_protect_student_profile_fields to allow students to update
--    their academic year (2nd-4th Year) and semester term (Term 1 or 2)
--    without unwanted post-onboarding lock.
-- 2. Validates academic standing bounds (current_year 2..4, current_term 1..2).
-- 3. Retains security against altering core identity and onboarding flags.
-- ============================================================================

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

    -- 2. Validate academic standing bounds when updated
    IF NEW.current_year IS NOT NULL AND (NEW.current_year < 2 OR NEW.current_year > 4) THEN
      RAISE EXCEPTION 'Academic year must be between 2 (2nd Year) and 4 (4th Year).';
    END IF;

    IF NEW.current_term IS NOT NULL AND (NEW.current_term < 1 OR NEW.current_term > 2) THEN
      RAISE EXCEPTION 'Academic term must be 1 (Term 1) or 2 (Term 2).';
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

COMMENT ON FUNCTION public.aiml_protect_student_profile_fields()
IS 'Protects immutable identity/auth fields while allowing students to update personal details, academic year (2..4), and term (1..2).';

REVOKE ALL ON FUNCTION public.aiml_protect_student_profile_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_protect_student_profile_fields() TO service_role;
