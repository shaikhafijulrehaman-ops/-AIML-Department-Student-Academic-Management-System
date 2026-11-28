-- ============================================================================
-- Migration 004: Fix Campaign Status Synchronization and CGPA Consistency
-- AIML Department Student Academic Management System
-- DVR & Dr. HS MIC College of Technology
-- ============================================================================

-- Function: public.aiml_sync_campaign_submission()
-- Ensures active campaign assignments are marked 'submitted' when a semester CGPA
-- record is either INSERTED or UPDATED for an eligible student.
-- Strictly matches:
-- 1. Exact student profile (NEW.student_profile_id)
-- 2. Target semester number (NEW.semester_number)
-- 3. Student's current academic year and term to prevent cross-year/cross-term collision
-- 4. Active campaigns only (c.is_active = true)
-- 5. Only updates assignments currently in 'pending' status
-- 6. Sets submitted_at timestamp
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

  -- Only proceed if cumulative_cgpa is a valid non-null numeric value
  IF NEW.cumulative_cgpa IS NOT NULL AND NEW.cumulative_cgpa > 0 THEN
    -- Automatically update matching active campaign statuses for this student
    UPDATE public.aiml_campaign_students cs
    SET status = 'submitted',
        submitted_at = pg_catalog.now()
    FROM public.aiml_update_campaigns c
    WHERE cs.campaign_id = c.id
      AND cs.student_profile_id = NEW.student_profile_id
      AND c.target_semester = NEW.semester_number
      AND (c.target_year IS NULL OR c.target_year = v_student_year)
      AND (c.target_term IS NULL OR c.target_term = v_student_term)
      AND c.is_active = true
      AND cs.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_sync_campaign_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_sync_campaign_submission() TO service_role;

-- Re-create the trigger to guarantee execution on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_aiml_semester_records_campaign_sync ON public.aiml_semester_records;
CREATE TRIGGER trg_aiml_semester_records_campaign_sync
AFTER INSERT OR UPDATE ON public.aiml_semester_records
FOR EACH ROW
EXECUTE FUNCTION public.aiml_sync_campaign_submission();
