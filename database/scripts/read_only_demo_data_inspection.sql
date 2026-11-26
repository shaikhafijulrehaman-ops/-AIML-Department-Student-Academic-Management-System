-- ============================================================================
-- AIML DEPARTMENT ACADEMIC SYSTEM - SAFE DEMO DATA INSPECTION (READ-ONLY)
-- Institution: DVR & Dr. HS MIC College of Technology
-- Purpose: Safely inspect and categorize potential demo records without mutating data.
-- ============================================================================

-- 1. Inspect Candidate Student Profiles & Auth Users
-- Candidate Register Numbers identified from the previous mock dataset
WITH candidate_regnos AS (
  SELECT unnest(ARRAY[
    '22H71A6125', '21H71A6105', '23H71A6115', '22H71A6142',
    '21H71A6133', '23H71A6150', '22H71A6108', '21H71A6112',
    '23H71A6120', '22H71A6119', '21H71A6145', '23H71A6138'
  ]) AS reg_no
)
SELECT 
  c.reg_no AS candidate_register_number,
  sp.id AS student_profile_id,
  sp.user_id AS auth_user_id,
  sp.full_name,
  sp.email,
  sp.current_year,
  sp.current_term,
  sp.is_active,
  sp.is_profile_completed,
  sp.created_at,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  CASE
    WHEN sp.id IS NULL AND u.id IS NULL THEN 'Not Present in Database'
    WHEN sp.email ILIKE '%example%' OR sp.email ILIKE '%demo%' OR sp.full_name ILIKE '%demo%' THEN 'Confirmed Demo Record'
    WHEN sp.id IS NOT NULL THEN 'Possible Demo Record (Verify Name & Registration Date)'
    ELSE 'Genuine or Uncertain Record'
  END AS record_classification
FROM candidate_regnos c
LEFT JOIN public.aiml_student_profiles sp ON sp.register_number = c.reg_no
LEFT JOIN auth.users u ON u.id = sp.user_id;

-- 2. Inspect Associated Semester Records for Identified Profiles
SELECT 
  sr.id AS semester_record_id,
  sr.student_profile_id,
  sp.register_number,
  sr.semester_number,
  sr.cumulative_cgpa,
  sr.submitted_at,
  'Associated Grade Record' AS record_note
FROM public.aiml_semester_records sr
JOIN public.aiml_student_profiles sp ON sp.id = sr.student_profile_id
WHERE sp.register_number IN (
  '22H71A6125', '21H71A6105', '23H71A6115', '22H71A6142',
  '21H71A6133', '23H71A6150', '22H71A6108', '21H71A6112',
  '23H71A6120', '22H71A6119', '21H71A6145', '23H71A6138'
);

-- 3. Inspect Associated Campaign Assignments for Identified Profiles
SELECT 
  cs.id AS campaign_student_id,
  cs.campaign_id,
  c.title AS campaign_title,
  sp.register_number,
  cs.submission_status,
  cs.assigned_at,
  'Associated Campaign Assignment' AS record_note
FROM public.aiml_campaign_students cs
JOIN public.aiml_student_profiles sp ON sp.id = cs.student_profile_id
JOIN public.aiml_update_campaigns c ON c.id = cs.campaign_id
WHERE sp.register_number IN (
  '22H71A6125', '21H71A6105', '23H71A6115', '22H71A6142',
  '21H71A6133', '23H71A6150', '22H71A6108', '21H71A6112',
  '23H71A6120', '22H71A6119', '21H71A6145', '23H71A6138'
);

-- 4. Inspect Potential Demo Update Campaigns
SELECT 
  id AS campaign_id,
  title,
  target_year,
  target_term,
  target_semester,
  is_active,
  created_at,
  CASE
    WHEN title ILIKE '%demo%' OR title ILIKE '%test%' THEN 'Confirmed Demo Campaign'
    WHEN title ILIKE '%Sample%' THEN 'Possible Demo Campaign'
    ELSE 'Genuine or Production Campaign'
  END AS campaign_classification
FROM public.aiml_update_campaigns
ORDER BY created_at DESC;

-- 5. Inspect Audit Log Traces for Identified Profiles
SELECT 
  al.id AS audit_id,
  al.action,
  al.entity_name,
  al.entity_id,
  al.metadata,
  al.created_at
FROM public.aiml_audit_logs al
WHERE al.metadata::text ILIKE ANY(ARRAY[
  '%22H71A6125%', '%21H71A6105%', '%23H71A6115%', '%22H71A6142%',
  '%21H71A6133%', '%23H71A6150%', '%22H71A6108%', '%21H71A6112%',
  '%23H71A6120%', '%22H71A6119%', '%21H71A6145%', '%23H71A6138%'
])
ORDER BY al.created_at DESC;
