-- ============================================================================
-- MIGRATION: 001_aiml_department_schema.sql
-- PROJECT: AIML Department Student Academic Management System
-- INSTITUTION: DVR & Dr. HS MIC College of Technology
-- DEPARTMENT: Artificial Intelligence and Machine Learning (AIML)
--
-- REVISION: Hardened Security, Search-Path Lockdown, Column-Level Privilege Separation,
--           Non-Destructive Academic History Preservation, and Idempotent Rerun Safety.
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
-- Function: public.aiml_is_hod()
-- Hardened HOD verification helper.
-- SECURITY DEFINER with empty search_path to prevent search_path hijacking.
-- Fully schema-qualified database objects.
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
  );
$$;

COMMENT ON FUNCTION public.aiml_is_hod() IS 'Returns true if the authenticated user has verified HOD status in the AIML department.';

-- Restrict execution: Revoke from PUBLIC & anon, grant strictly to authenticated and service_role
REVOKE ALL ON FUNCTION public.aiml_is_hod() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aiml_is_hod() FROM anon;
GRANT EXECUTE ON FUNCTION public.aiml_is_hod() TO authenticated, service_role;


-- ============================================================================
-- SECTION 2: APPLICATION TABLES (WITH NON-DESTRUCTIVE HISTORY PRESERVATION)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE 1: aiml_user_roles
-- Purpose: System-level role mapping for HOD and Student authorization.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hod', 'student')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.aiml_user_roles IS 'Role assignments for AIML portal users. Modification is strictly restricted to trusted administrative operations.';


-- ----------------------------------------------------------------------------
-- TABLE 2: aiml_student_profiles
-- Purpose: Student personal and academic background information.
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
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  location TEXT,
  profile_photo_path TEXT,
  admission_year INTEGER NOT NULL,
  current_year INTEGER NOT NULL CHECK (current_year BETWEEN 1 AND 4),
  current_term INTEGER NOT NULL CHECK (current_term BETWEEN 1 AND 2),
  qualification_type TEXT CHECK (qualification_type IN ('intermediate', 'diploma')),
  ssc_percentage NUMERIC(5,2) CHECK (ssc_percentage >= 0.00 AND ssc_percentage <= 100.00),
  intermediate_percentage NUMERIC(5,2) CHECK (intermediate_percentage >= 0.00 AND intermediate_percentage <= 100.00),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT chk_register_number_not_empty CHECK (pg_catalog.length(pg_catalog.btrim(register_number)) > 0)
);

COMMENT ON TABLE public.aiml_student_profiles IS 'Personal and academic profile of AIML students. Identity and academic milestone fields are HOD-controlled.';


-- ----------------------------------------------------------------------------
-- TABLE 3: aiml_semester_records
-- Purpose: Cumulative semester-wise academic records and CGPA.
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
  cumulative_percentage NUMERIC(5,2) CHECK (cumulative_percentage >= 0.00 AND cumulative_percentage <= 100.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT uq_aiml_student_semester UNIQUE (student_profile_id, semester_number)
);

COMMENT ON TABLE public.aiml_semester_records IS 'Semester academic records. Cumulative CGPA is recorded per semester; not calculated via simple average.';


-- ----------------------------------------------------------------------------
-- TABLE 4: aiml_update_campaigns
-- Purpose: Academic update campaigns initiated by the HOD.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aiml_update_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  target_semester INTEGER NOT NULL CHECK (target_semester BETWEEN 1 AND 8),
  deadline DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.aiml_update_campaigns IS 'HOD-initiated update requests for specific semester CGPA records.';


-- ----------------------------------------------------------------------------
-- TABLE 5: aiml_campaign_students
-- Purpose: Submission tracking per student for each active campaign.
--
-- Academic Preservation Rule:
-- campaign_id and student_profile_id use ON DELETE RESTRICT to preserve
-- formal audit and compliance history of student participation in campaigns.
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

COMMENT ON TABLE public.aiml_campaign_students IS 'Tracks pending and submitted student updates per campaign. Status transitions automatically upon semester record save.';


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
-- Enforces that students cannot modify HOD-controlled academic and identity fields:
-- id, user_id, register_number, admission_year, current_year, current_term, created_at.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_protect_student_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If caller is not HOD, forbid altering protected academic and identity attributes
  IF NOT public.aiml_is_hod() THEN
    IF (OLD.id IS DISTINCT FROM NEW.id) OR
       (OLD.user_id IS DISTINCT FROM NEW.user_id) OR
       (OLD.register_number IS DISTINCT FROM NEW.register_number) OR
       (OLD.admission_year IS DISTINCT FROM NEW.admission_year) OR
       (OLD.current_year IS DISTINCT FROM NEW.current_year) OR
       (OLD.current_term IS DISTINCT FROM NEW.current_term) OR
       (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
      RAISE EXCEPTION 'Academic and identity attributes (id, user_id, register_number, admission_year, current_year, current_term, created_at) are locked and can only be modified by the HOD.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_protect_student_profile_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_protect_student_profile_fields() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 3: public.aiml_validate_semester_eligibility()
-- Enforces academic eligibility at database level and protects structural fields:
-- id, student_profile_id, semester_number, created_at cannot be transferred/modified.
-- Maximum eligible semester formula: (current_year - 1) * 2 + current_term.
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
  v_max_eligible_semester pg_catalog.int4;
BEGIN
  -- Structural field protection on update for non-HOD
  IF TG_OP = 'UPDATE' AND NOT public.aiml_is_hod() THEN
    IF (OLD.id IS DISTINCT FROM NEW.id) OR
       (OLD.student_profile_id IS DISTINCT FROM NEW.student_profile_id) OR
       (OLD.semester_number IS DISTINCT FROM NEW.semester_number) OR
       (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
      RAISE EXCEPTION 'Semester record structural attributes (id, student_profile_id, semester_number, created_at) cannot be modified or transferred.';
    END IF;
  END IF;

  -- Retrieve student profile details including active status
  SELECT current_year, current_term, user_id, is_active
  INTO v_current_year, v_current_term, v_profile_user_id, v_is_active
  FROM public.aiml_student_profiles
  WHERE id = NEW.student_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referenced student profile % does not exist.', NEW.student_profile_id;
  END IF;

  -- Reject academic updates if student profile is inactive
  IF NOT v_is_active THEN
    RAISE EXCEPTION 'Academic record updates are blocked because student profile % is inactive.', NEW.student_profile_id;
  END IF;

  -- Verify null-safe ownership if caller is a student
  IF NOT public.aiml_is_hod() AND (auth.uid() IS DISTINCT FROM v_profile_user_id) THEN
    RAISE EXCEPTION 'Access denied: You can only insert or update semester records for your own student profile.';
  END IF;

  -- Calculate maximum semester based on official academic formula: (current_year - 1) * 2 + current_term
  v_max_eligible_semester := ((v_current_year - 1) * 2) + v_current_term;

  -- Reject records beyond currently eligible semester
  IF NEW.semester_number > v_max_eligible_semester THEN
    RAISE EXCEPTION 'Semester % exceeds your current academic eligibility (maximum eligible semester is % based on Year % Term %).',
      NEW.semester_number, v_max_eligible_semester, v_current_year, v_current_term;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_validate_semester_eligibility() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_validate_semester_eligibility() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 4: public.aiml_sync_campaign_submission()
-- Automatically marks active matching campaigns as 'submitted' when a semester
-- record is saved (inserted or updated).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aiml_sync_campaign_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Automatically update matching active campaign statuses for this student
  UPDATE public.aiml_campaign_students cs
  SET status = 'submitted',
      submitted_at = pg_catalog.now()
  FROM public.aiml_update_campaigns c
  WHERE cs.campaign_id = c.id
    AND cs.student_profile_id = NEW.student_profile_id
    AND c.target_semester = NEW.semester_number
    AND c.is_active = true
    AND cs.status = 'pending';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.aiml_sync_campaign_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aiml_sync_campaign_submission() TO service_role;


-- ----------------------------------------------------------------------------
-- Function 5: public.aiml_audit_log_trigger()
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
-- Function 6: public.aiml_hod_update_student_academic_fields()
-- Secure HOD-only RPC function to update protected academic milestones.
-- Enables HOD to manage student progression without granting students column access.
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
  -- Strict verification: only authenticated HOD can invoke
  IF NOT public.aiml_is_hod() THEN
    RAISE EXCEPTION 'Unauthorized: Only an authenticated HOD can update academic milestones.';
  END IF;

  -- Validate range boundaries
  IF p_current_year NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'current_year must be between 1 and 4.';
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

-- Semester records indexes
CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_student_profile_id
  ON public.aiml_semester_records(student_profile_id);

CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_semester_number
  ON public.aiml_semester_records(semester_number);

CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_cumulative_cgpa
  ON public.aiml_semester_records(cumulative_cgpa);

CREATE INDEX IF NOT EXISTS idx_aiml_semester_records_lookup
  ON public.aiml_semester_records(student_profile_id, semester_number);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_aiml_update_campaigns_active
  ON public.aiml_update_campaigns(is_active, target_semester);

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
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aiml_campaigns_student_read_active" ON public.aiml_update_campaigns;
CREATE POLICY "aiml_campaigns_student_read_active"
  ON public.aiml_update_campaigns
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.aiml_student_profiles
      WHERE user_id = auth.uid() AND is_active = true
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
      SELECT id FROM public.aiml_student_profiles WHERE user_id = auth.uid() AND is_active = true
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
-- Authenticated users can SELECT and INSERT their profile, but can only UPDATE
-- personal editable attributes. Academic and identity columns are ungrantable to students.
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
  intermediate_percentage
) ON public.aiml_student_profiles TO authenticated;

-- ----------------------------------------------------------------------------
-- Table Grants: aiml_semester_records
-- Column-level privilege separation:
-- Authenticated users can SELECT and INSERT eligible records, but can only UPDATE
-- cumulative_cgpa and cumulative_percentage. Structural columns cannot be updated.
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.aiml_semester_records TO authenticated;
REVOKE INSERT ON public.aiml_semester_records FROM authenticated;
GRANT INSERT (
  student_profile_id,
  semester_number,
  cumulative_cgpa,
  cumulative_percentage
) ON public.aiml_semester_records TO authenticated;

REVOKE UPDATE ON public.aiml_semester_records FROM authenticated;
GRANT UPDATE (
  cumulative_cgpa,
  cumulative_percentage
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
