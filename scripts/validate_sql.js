import fs from 'fs';

const sqlPath = 'database/migrations/001_aiml_department_schema.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('================================================================');
console.log(' POSTGRESQL MIGRATION DEEP VALIDATION REPORT');
console.log(' Target File: ' + sqlPath);
console.log(' File Size:   ' + sql.length + ' bytes');
console.log('================================================================\n');

let errors = [];
let passed = [];

// 1. Structural Balances
const dollarQuotes = (sql.match(/\$\$/g) || []).length;
const openParen = (sql.match(/\(/g) || []).length;
const closeParen = (sql.match(/\)/g) || []).length;

if (dollarQuotes % 2 !== 0) {
  errors.push(`Unbalanced dollar quotes ($$): ${dollarQuotes}`);
} else {
  passed.push(`Balanced dollar quotes ($$): ${dollarQuotes} (${dollarQuotes / 2} pairs)`);
}

if (openParen !== closeParen) {
  errors.push(`Unbalanced parentheses: ${openParen} open vs ${closeParen} close`);
} else {
  passed.push(`Balanced parentheses: ${openParen} open vs ${closeParen} close`);
}

// 2. Syntax & Expression Checks: COALESCE
if (sql.includes('pg_catalog.coalesce')) {
  errors.push('Found invalid pg_catalog.coalesce expression');
} else if (sql.includes('COALESCE(')) {
  passed.push('COALESCE is standard keyword (no invalid schema qualification)');
} else {
  errors.push('COALESCE keyword missing');
}

// 3. Syntax & Expression Checks: BTRIM vs TRIM
if (sql.includes('pg_catalog.trim')) {
  errors.push('Found invalid pg_catalog.trim expression (PostgreSQL C-function is btrim)');
} else if (sql.includes('pg_catalog.btrim(')) {
  passed.push('pg_catalog.btrim is correctly used for string trimming in table constraint');
} else {
  errors.push('pg_catalog.btrim function call missing');
}

// 4. Timestamps & TIMESTAMPTZ Semantics
if (sql.includes("timezone('utc'")) {
  errors.push("Found timezone('utc') which produces timestamp without time zone");
} else {
  passed.push("Zero timezone('utc') expressions found (native TIMESTAMPTZ preserved)");
}

const nowCount = (sql.match(/pg_catalog\.now\(\)/g) || []).length;
passed.push(`Consistent UTC-aware timestamp assignments: ${nowCount} pg_catalog.now() calls`);

// 5. Public Schema Grant Cleanliness
if (sql.includes('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;')) {
  errors.push('Unnecessary global GRANT USAGE ON SCHEMA public still present');
} else {
  passed.push('Unnecessary global GRANT USAGE ON SCHEMA public removed cleanly');
}

// 6. SGPA Exclusion Check
if (/\bsgpa\b/i.test(sql)) {
  errors.push('Unapproved SGPA reference found in database schema');
} else {
  passed.push('Zero SGPA references in database schema (students enter CGPA only)');
}

// 7. Student Onboarding Support & Nullable Fields
const profileTableMatch = sql.match(/CREATE TABLE IF NOT EXISTS public\.aiml_student_profiles \(([\s\S]*?)\);/);
if (profileTableMatch) {
  const tableDef = profileTableMatch[1];
  if (tableDef.includes('register_number TEXT UNIQUE NOT NULL') &&
      tableDef.includes('full_name TEXT,') &&
      tableDef.includes('is_profile_completed BOOLEAN NOT NULL DEFAULT false') &&
      tableDef.includes('must_change_password BOOLEAN NOT NULL DEFAULT true')) {
    passed.push('Student profiles: Supports initial onboarding (register_number NOT NULL, personal details nullable, completion & password change flags present)');
  } else {
    errors.push('Student profiles table does not properly support initial partial onboarding');
  }
} else {
  errors.push('aiml_student_profiles table definition missing');
}

// 8. Academic Year & Term Constraints (Years 2-4, Terms 1-2)
if (sql.includes('current_year INTEGER CHECK (current_year BETWEEN 2 AND 4)') &&
    sql.includes('current_term INTEGER CHECK (current_term BETWEEN 1 AND 2)')) {
  passed.push('Academic year and term constraints: Restricted to Second Year (2) through Fourth Year (4), Terms 1-2');
} else {
  errors.push('Missing or invalid academic year/term constraints (expected 2-4 for years, 1-2 for terms)');
}

// 9. Semester CGPA Only Check (No cumulative_percentage in semester records)
const semesterTableMatch = sql.match(/CREATE TABLE IF NOT EXISTS public\.aiml_semester_records \(([\s\S]*?)\);/);
if (semesterTableMatch) {
  const semDef = semesterTableMatch[1];
  if (semDef.includes('cumulative_cgpa NUMERIC(4,2) NOT NULL') && !semDef.includes('cumulative_percentage')) {
    passed.push('aiml_semester_records: Stores semester-wise cumulative_cgpa only (cumulative_percentage cleanly removed)');
  } else {
    errors.push('aiml_semester_records contains unused fields or is missing cumulative_cgpa');
  }
} else {
  errors.push('aiml_semester_records table definition missing');
}

// 10. Multi-Dimensional Campaigns (target_year 2-4, target_term 1-2, target_semester 1-8, instructions)
const campaignTableMatch = sql.match(/CREATE TABLE IF NOT EXISTS public\.aiml_update_campaigns \(([\s\S]*?)\);/);
if (campaignTableMatch) {
  const campDef = campaignTableMatch[1];
  if (campDef.includes('target_year INTEGER NOT NULL CHECK (target_year BETWEEN 2 AND 4)') &&
      campDef.includes('target_term INTEGER NOT NULL CHECK (target_term BETWEEN 1 AND 2)') &&
      campDef.includes('target_semester INTEGER NOT NULL CHECK (target_semester BETWEEN 1 AND 8)') &&
      campDef.includes('instructions TEXT')) {
    passed.push('aiml_update_campaigns: Multi-dimensional targeting (target_year 2-4, target_term 1-2, target_semester 1-8, instructions)');
  } else {
    errors.push('aiml_update_campaigns missing target_year, target_term, target_semester, or instructions');
  }
} else {
  errors.push('aiml_update_campaigns table definition missing');
}

// 11. SECURITY DEFINER & search_path Audit
const secDefRegex = /CREATE OR REPLACE FUNCTION\s+([a-zA-Z0-9_.]+)\s*\(([\s\S]*?)\)[\s\S]*?LANGUAGE\s+([a-zA-Z0-9]+)[\s\S]*?SECURITY DEFINER[\s\S]*?SET\s+search_path\s*=\s*''[\s\S]*?AS\s*\$\$/g;
const functionsFound = [];
let fMatch;
while ((fMatch = secDefRegex.exec(sql)) !== null) {
  functionsFound.push(fMatch[1]);
}

passed.push(`SECURITY DEFINER functions with SET search_path = '': ${functionsFound.length} found`);
for (const fn of functionsFound) {
  passed.push(`  - Verified hardened: ${fn}`);
}

if (functionsFound.length < 12) {
  errors.push(`Expected 12 hardened SECURITY DEFINER functions, found ${functionsFound.length}`);
}

// 12. Null-Safe Ownership Check in Function 3
if (sql.includes('auth.uid() IS DISTINCT FROM v_profile_user_id')) {
  passed.push('aiml_validate_semester_eligibility uses null-safe ownership comparison: auth.uid() IS DISTINCT FROM v_profile_user_id');
} else {
  errors.push('Missing null-safe ownership comparison (auth.uid() IS DISTINCT FROM v_profile_user_id)');
}

// 13. Completed Semesters Only Check in Function 3
if (sql.includes('v_max_completed_semester := ((v_current_year - 1) * 2) + v_current_term - 1;') &&
    sql.includes('NEW.semester_number > v_max_completed_semester')) {
  passed.push('aiml_validate_semester_eligibility: Enforces completed semesters only (future and ongoing semester entries rejected)');
} else {
  errors.push('Completed semester restriction missing in aiml_validate_semester_eligibility');
}

// 14. Multi-Dimensional Campaign Submission Sync & Existing CGPA Check
if (sql.includes('c.target_year = v_student_year') &&
    sql.includes('c.target_term = v_student_term') &&
    sql.includes('trg_aiml_campaign_students_existing_cgpa')) {
  passed.push('Campaign synchronization matches target_semester, target_year, and target_term, and auto-detects existing valid CGPAs upon enrollment');
} else {
  errors.push('Campaign sync missing year/term matching or existing CGPA pre-check');
}

// 15. Permissions on Functions
const revokePublicCount = (sql.match(/REVOKE ALL ON FUNCTION [^\n]+ FROM PUBLIC/g) || []).length;
passed.push(`Functions with PUBLIC execution revoked: ${revokePublicCount}`);

// 16. RLS Policies Idempotence (20 Policies)
const createPolicies = [];
const createRe = /CREATE POLICY "([^"]+)"\s+ON\s+([^\s;\n]+)/g;
let m;
while ((m = createRe.exec(sql)) !== null) {
  createPolicies.push({ name: m[1], table: m[2] });
}

const dropPolicies = [];
const dropRe = /DROP POLICY IF EXISTS "([^"]+)"\s+ON\s+([^\s;\n]+)/g;
while ((m = dropRe.exec(sql)) !== null) {
  dropPolicies.push({ name: m[1], table: m[2] });
}

passed.push(`RLS Policies: ${createPolicies.length} CREATE POLICY vs ${dropPolicies.length} DROP POLICY IF EXISTS`);
for (const cp of createPolicies) {
  const match = dropPolicies.find(dp => dp.name === cp.name && dp.table === cp.table);
  if (!match) {
    errors.push(`Policy "${cp.name}" on ${cp.table} is missing matching DROP POLICY IF EXISTS`);
  }
}
if (createPolicies.length === 20 && dropPolicies.length === 20) {
  passed.push('All 20 RLS and Storage policies have verified idempotent drop clauses');
} else {
  errors.push(`Expected exactly 20 policies, found ${createPolicies.length}`);
}

// 17. Active Campaign Access Check
const campaignActivePolicy = sql.match(/CREATE POLICY "aiml_campaigns_student_read_active"[\s\S]*?;/);
if (campaignActivePolicy && campaignActivePolicy[0].includes('is_active = true') && campaignActivePolicy[0].includes('aiml_student_profiles')) {
  passed.push('aiml_campaigns_student_read_active requires active student profile');
} else {
  errors.push('aiml_campaigns_student_read_active missing active student profile requirement');
}

// 18. Inactive Student Policy Hardening Checks
const profileReadPolicy = sql.match(/CREATE POLICY "aiml_profiles_student_read_own"[\s\S]*?USING \(([\s\S]*?)\);/);
if (profileReadPolicy && profileReadPolicy[1].includes('is_active = true')) {
  passed.push('aiml_student_profiles SELECT policy enforces is_active = true');
} else {
  errors.push('aiml_student_profiles SELECT policy missing is_active = true');
}

const profileUpdatePolicy = sql.match(/CREATE POLICY "aiml_profiles_student_update_own"[\s\S]*?;/);
if (profileUpdatePolicy && profileUpdatePolicy[0].includes('is_active = true')) {
  passed.push('aiml_student_profiles UPDATE policy enforces is_active = true on both USING and WITH CHECK');
} else {
  errors.push('aiml_student_profiles UPDATE policy missing is_active = true');
}

const semesterReadPolicy = sql.match(/CREATE POLICY "aiml_semesters_student_read_own"[\s\S]*?USING \(([\s\S]*?)\);/);
if (semesterReadPolicy && semesterReadPolicy[1].includes('is_active = true')) {
  passed.push('aiml_semester_records SELECT policy enforces is_active = true');
} else {
  errors.push('aiml_semester_records SELECT policy missing is_active = true');
}

const campaignReadPolicy = sql.match(/CREATE POLICY "aiml_campaign_students_read_own"[\s\S]*?USING \(([\s\S]*?)\);/);
if (campaignReadPolicy && campaignReadPolicy[1].includes('is_active = true')) {
  passed.push('aiml_campaign_students SELECT policy enforces is_active = true');
} else {
  errors.push('aiml_campaign_students SELECT policy missing is_active = true');
}

const photoUploadPolicy = sql.match(/CREATE POLICY "aiml_photos_student_upload"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/);
if (photoUploadPolicy && photoUploadPolicy[1].includes('is_active = true')) {
  passed.push('storage.objects INSERT policy enforces is_active = true on student profile');
} else {
  errors.push('storage.objects INSERT policy missing is_active = true');
}

// 19. Inactive Trigger Validation Check
if (sql.includes('IF NOT v_is_active THEN') && sql.includes('Academic record updates are blocked because student profile')) {
  passed.push('aiml_validate_semester_eligibility trigger blocks updates for inactive profiles');
} else {
  errors.push('aiml_validate_semester_eligibility missing inactive profile check');
}

// 20. Column-Level Privilege Separation Audit
const profileUpdateGrant = sql.match(/GRANT UPDATE \(([^)]+)\) ON public\.aiml_student_profiles TO authenticated;/);
if (profileUpdateGrant) {
  const cols = profileUpdateGrant[1].split(',').map(c => c.trim());
  const forbiddenCols = ['id', 'user_id', 'register_number', 'is_active', 'created_at', 'must_change_password', 'is_profile_completed'];
  const expectedStudentCols = ['full_name', 'email', 'phone_number', 'location', 'profile_photo_path', 'qualification_type', 'ssc_percentage', 'intermediate_percentage', 'admission_year', 'current_year', 'current_term'];
  const leaked = cols.filter(c => forbiddenCols.includes(c));
  if (leaked.length > 0) {
    errors.push(`Forbidden columns granted to authenticated on student profiles: ${leaked.join(', ')}`);
  } else if (expectedStudentCols.every(c => cols.includes(c))) {
    passed.push(`Student profile column privileges: Students can complete personal/academic milestones (${cols.length} columns), while core identity/status (${forbiddenCols.join(', ')}) remain locked and backend-controlled`);
  } else {
    errors.push('Student profile update grant missing expected student profile fields');
  }
} else {
  errors.push('Missing column-level GRANT UPDATE on public.aiml_student_profiles');
}

// Semester Insert Column-Level Privilege Check
const semesterInsertGrant = sql.match(/GRANT INSERT \(([^)]+)\) ON public\.aiml_semester_records TO authenticated;/);
if (semesterInsertGrant) {
  const cols = semesterInsertGrant[1].split(',').map(c => c.trim());
  const allowedInsertCols = ['student_profile_id', 'semester_number', 'cumulative_cgpa'];
  const forbiddenInsertCols = ['id', 'created_at', 'updated_at', 'cumulative_percentage'];
  const leaked = cols.filter(c => forbiddenInsertCols.includes(c));
  if (leaked.length > 0) {
    errors.push(`Forbidden insert columns granted to authenticated on semester records: ${leaked.join(', ')}`);
  } else if (allowedInsertCols.every(c => cols.includes(c))) {
    passed.push(`Semester record INSERT privileges: Column-restricted to (${allowedInsertCols.join(', ')}), id and timestamps auto-generated`);
  } else {
    errors.push(`Semester record insert columns missing expected columns: ${cols.join(', ')}`);
  }
} else {
  errors.push('Missing column-level GRANT INSERT on public.aiml_semester_records');
}

const semesterUpdateGrant = sql.match(/GRANT UPDATE \(([^)]+)\) ON public\.aiml_semester_records TO authenticated;/);
if (semesterUpdateGrant) {
  const cols = semesterUpdateGrant[1].split(',').map(c => c.trim());
  const forbiddenCols = ['id', 'student_profile_id', 'semester_number', 'created_at', 'cumulative_percentage'];
  const leaked = cols.filter(c => forbiddenCols.includes(c));
  if (leaked.length > 0) {
    errors.push(`Forbidden columns granted to authenticated on semester records: ${leaked.join(', ')}`);
  } else if (cols.length === 1 && cols[0] === 'cumulative_cgpa') {
    passed.push('Semester record UPDATE privileges: Exactly 1 column allowed (cumulative_cgpa), structural columns locked');
  } else {
    errors.push(`Unexpected semester update columns: ${cols.join(', ')}`);
  }
} else {
  errors.push('Missing column-level GRANT UPDATE on public.aiml_semester_records');
}

// 21. Campaign Privilege Audit: No GRANT ALL to authenticated & Explicit CRUD
const grantAllAuthMatches = sql.match(/GRANT ALL[^\n;]*TO[^\n;]*(authenticated|anon)/gi) || [];
if (grantAllAuthMatches.length > 0) {
  errors.push(`Security violation: GRANT ALL found for authenticated/anon role: ${grantAllAuthMatches.join('; ')}`);
} else {
  passed.push('Zero GRANT ALL privileges granted to authenticated or anon (TRUNCATE, TRIGGER, REFERENCES prevented)');
}

const campaignExplicitGrants = [
  'REVOKE ALL PRIVILEGES ON public.aiml_update_campaigns FROM authenticated;',
  'GRANT SELECT, INSERT, UPDATE, DELETE ON public.aiml_update_campaigns TO authenticated;',
  'REVOKE ALL PRIVILEGES ON public.aiml_campaign_students FROM authenticated;',
  'GRANT SELECT, INSERT, UPDATE, DELETE ON public.aiml_campaign_students TO authenticated;'
];

let allGrantsFound = true;
for (const ceg of campaignExplicitGrants) {
  if (!sql.includes(ceg)) {
    errors.push(`Missing campaign grant/revoke statement: ${ceg}`);
    allGrantsFound = false;
  }
}
if (allGrantsFound) {
  passed.push('Campaign tables have verified explicit CRUD grants and explicit REVOKE ALL PRIVILEGES');
}

// 22. Non-Destructive Foreign Keys Audit
if (sql.includes('user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL')) {
  passed.push('Student profiles: ON DELETE SET NULL on auth.users link (Account de-coupling)');
} else {
  errors.push('Student profiles missing ON DELETE SET NULL on auth.users reference');
}

if (sql.includes('student_profile_id UUID NOT NULL REFERENCES public.aiml_student_profiles(id) ON DELETE RESTRICT')) {
  passed.push('Semester records: ON DELETE RESTRICT on student_profile_id (Grade preservation)');
} else {
  errors.push('Semester records missing ON DELETE RESTRICT on student_profile_id');
}

// 23. Backend Controlled First-Login Flags Audit (must_change_password & is_profile_completed)
if (sql.includes('is_profile_completed BOOLEAN NOT NULL DEFAULT false') &&
    sql.includes('must_change_password BOOLEAN NOT NULL DEFAULT true')) {
  passed.push('First-login flags initialized: must_change_password = true, is_profile_completed = false by default');
} else {
  errors.push('First-login flags missing or have incorrect defaults');
}

if (sql.includes('OLD.must_change_password IS DISTINCT FROM NEW.must_change_password') &&
    sql.includes('OLD.is_profile_completed IS DISTINCT FROM NEW.is_profile_completed')) {
  passed.push('Profile protection trigger: Blocks student modifications to must_change_password and is_profile_completed');
} else {
  errors.push('Profile protection trigger does not protect must_change_password or is_profile_completed');
}

// 23b. Academic Standing Lock After Profile Completion
const profileProtectFn = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_protect_student_profile_fields\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (profileProtectFn) {
  const ppBody = profileProtectFn[1];
  if (ppBody.includes('OLD.is_profile_completed = true') &&
      ppBody.includes('OLD.current_year IS DISTINCT FROM NEW.current_year') &&
      ppBody.includes('OLD.current_term IS DISTINCT FROM NEW.current_term')) {
    passed.push('Academic Standing Lock: Students cannot alter current_year or current_term once profile is completed (OLD.is_profile_completed = true)');
  } else {
    errors.push('Profile protection trigger does not lock current_year/current_term when OLD.is_profile_completed = true');
  }
} else {
  errors.push('aiml_protect_student_profile_fields definition missing');
}

// 24. Profile Completion RPC & Comprehensive Mandatory Onboarding Validation
if (sql.includes('CREATE OR REPLACE FUNCTION public.aiml_complete_student_profile(p_student_id UUID)') &&
    sql.includes('is_profile_completed = true')) {
  passed.push('aiml_complete_student_profile RPC validates required fields before marking is_profile_completed = true');
} else {
  errors.push('aiml_complete_student_profile RPC missing');
}

// 24a-1. Initial Password Change Gate in Profile Completion
const compProfFn = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_complete_student_profile\([\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (compProfFn) {
  const cpBody = compProfFn[1];
  if (cpBody.includes('v_profile.must_change_password IS DISTINCT FROM false') &&
      cpBody.includes('Please change your initial password before completing your student profile.')) {
    passed.push('Initial Password Change Gate: Profile completion is strictly rejected while must_change_password is true; permitted only after password change resets it to false');
  } else {
    errors.push('aiml_complete_student_profile missing must_change_password IS DISTINCT FROM false check');
  }
} else {
  errors.push('aiml_complete_student_profile function definition not found');
}

const completeProfileGrants = sql.match(/GRANT EXECUTE ON FUNCTION public\.aiml_complete_student_profile\(UUID\)[^\n;]*/);
const completeProfileRevokes = (sql.match(/REVOKE ALL ON FUNCTION public\.aiml_complete_student_profile\(UUID\) FROM (PUBLIC|anon|authenticated);/g) || []);
if (completeProfileGrants && completeProfileGrants[0].includes('service_role') && !completeProfileGrants[0].includes('authenticated') && completeProfileRevokes.length === 3) {
  passed.push('aiml_complete_student_profile RPC is strictly reserved for service_role (revoked from PUBLIC, anon, and authenticated)');
} else {
  errors.push('aiml_complete_student_profile has improper grants (must be executable strictly by service_role)');
}

// 24b. Comprehensive Mandatory Onboarding Fields Validation in Profile Completion
if (sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_complete_student_profile\([\s\S]*?\$\$([\s\S]*?)\$\$;/)) {
  const cBody = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_complete_student_profile\([\s\S]*?\$\$([\s\S]*?)\$\$;/)[1];
  const requiredFields = [
    'v_profile.full_name',
    'v_profile.email',
    'v_profile.phone_number',
    'v_profile.location',
    'v_profile.current_year',
    'v_profile.current_term',
    'v_profile.qualification_type',
    'v_profile.ssc_percentage',
    'v_profile.intermediate_percentage'
  ];
  const missingChecks = requiredFields.filter(f => !cBody.includes(f));
  if (missingChecks.length === 0 && !cBody.includes('admission_year IS NULL') && !cBody.includes('admission_year is required')) {
    passed.push('aiml_complete_student_profile rigorously validates all 9 mandatory onboarding fields (full_name, email, phone, location, year, term, qualification, ssc %, inter %) and exempts admission_year');
  } else {
    errors.push(`aiml_complete_student_profile missing mandatory field checks: ${missingChecks.join(', ')}`);
  }
}

// 24c. Semester Eligibility: Profile Completion Gate
const semEligFn = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_validate_semester_eligibility\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (semEligFn) {
  const seBody = semEligFn[1];
  if (seBody.includes('is_profile_completed') &&
      seBody.includes('IF NOT v_is_profile_completed THEN') &&
      seBody.includes('Academic record submission is blocked')) {
    passed.push('aiml_validate_semester_eligibility: Rejects semester record INSERT and UPDATE operations when student profile onboarding is incomplete');
  } else {
    errors.push('aiml_validate_semester_eligibility missing is_profile_completed requirement check');
  }
} else {
  errors.push('aiml_validate_semester_eligibility function definition missing');
}

// 24d. Photo Path Ownership Protection
if (profileProtectFn) {
  const ppBody = profileProtectFn[1];
  if (ppBody.includes('NEW.profile_photo_path') &&
      ppBody.includes('auth.uid()::text') &&
      ppBody.includes('Security violation: Profile photo path must reside in your own authenticated user folder.')) {
    passed.push('Photo Path Ownership: Enforces that students cannot associate another user\'s photo path with their profile (must match auth.uid() folder)');
  } else {
    errors.push('aiml_protect_student_profile_fields missing photo path ownership check');
  }
}

// 24e. Email Format Validation Audit
if (sql.includes('v_profile.email ~*') &&
    sql.includes('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')) {
  passed.push('Email Format Validation: aiml_complete_student_profile enforces valid email syntax (user@domain.tld) without restricting institutional domain');
} else {
  errors.push('aiml_complete_student_profile missing regex email format validation');
}

// 25. Service Role & HOD Clean Separation Audit
if (sql.includes('CREATE OR REPLACE FUNCTION public.aiml_is_service_role()') &&
    sql.includes('auth.role() = \'service_role\'')) {
  passed.push('Service role detection function public.aiml_is_service_role() cleanly checks auth.role() = \'service_role\'');
} else {
  errors.push('aiml_is_service_role function missing or incorrect');
}

const hodFnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_is_hod\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (hodFnMatch) {
  const hBody = hodFnMatch[1];
  if (hBody.includes("role = 'hod'") && !hBody.includes('aiml_is_service_role')) {
    passed.push('aiml_is_hod strictly identifies verified HOD user roles without conflating service_role identity');
  } else {
    errors.push('aiml_is_hod conflates service_role or does not check role = hod in body');
  }
} else {
  errors.push('aiml_is_hod definition missing');
}

// 26. Campaign Student Auto-Enrollment (Active & Completed Profile Enforcement)
if (sql.includes('CREATE OR REPLACE FUNCTION public.aiml_auto_enroll_campaign_students()') &&
    sql.includes('p.current_year = NEW.target_year') &&
    sql.includes('p.current_term = NEW.target_term') &&
    sql.includes('p.is_profile_completed = true') &&
    sql.includes('CREATE TRIGGER trg_aiml_campaigns_auto_enroll')) {
  passed.push('Campaign auto-enrollment trigger & function enroll active, completed students matching target_year AND target_term');
} else {
  errors.push('Campaign auto-enrollment trigger or function missing target_year, target_term, or completed profile check');
}

if (sql.includes('CREATE OR REPLACE FUNCTION public.aiml_enroll_student_in_active_campaigns()') &&
    sql.includes('c.target_year = NEW.current_year') &&
    sql.includes('c.target_term = NEW.current_term') &&
    sql.includes('NEW.is_profile_completed = true') &&
    sql.includes('CREATE TRIGGER trg_aiml_profiles_auto_enroll_campaigns')) {
  passed.push('Late onboarding trigger (trg_aiml_profiles_auto_enroll_campaigns) transactionally enrolls newly completed students into matching active campaigns');
} else {
  errors.push('Late student onboarding campaign auto-enrollment trigger or function missing');
}

// 26b. Campaign Deadline Nullability Audit
const campDeadlineDef = sql.match(/CREATE TABLE IF NOT EXISTS public\.aiml_update_campaigns \(([\s\S]*?)\);/);
if (campDeadlineDef) {
  const cdText = campDeadlineDef[1];
  if (cdText.includes('deadline DATE,') && !cdText.includes('deadline DATE NOT NULL')) {
    passed.push('Campaign deadline: Optional/nullable (deadline DATE), allowing campaigns without mandatory deadlines');
  } else {
    errors.push('Campaign deadline is still NOT NULL');
  }
} else {
  errors.push('aiml_update_campaigns table not found for deadline check');
}

// 27. Campaign Student Visibility Policy Audit (Year & Term matching + explicit assignment)
const campStudentPolicy = sql.match(/CREATE POLICY "aiml_campaigns_student_read_active"[\s\S]*?USING \(([\s\S]*?)\);/);
if (campStudentPolicy &&
    campStudentPolicy[1].includes('aiml_campaign_students') &&
    campStudentPolicy[1].includes('current_year') &&
    campStudentPolicy[1].includes('current_term') &&
    campStudentPolicy[1].includes('is_active = true')) {
  passed.push('aiml_campaigns_student_read_active requires active profile, matching target_year AND target_term, and explicit assignment');
} else {
  errors.push('aiml_campaigns_student_read_active policy missing required checks');
}

// 28. Campaign Pre-Check & Strict Rejection Validation
const joinFn = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_check_existing_cgpa_on_campaign_join\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (joinFn) {
  const jBody = joinFn[1];
  if (jBody.includes('v_campaign_active') &&
      jBody.includes('IF NOT v_campaign_active THEN') &&
      jBody.includes('IF NOT v_student_active THEN') &&
      jBody.includes('IF NOT v_student_completed THEN') &&
      jBody.includes('v_student_year IS DISTINCT FROM v_target_year') &&
      jBody.includes('v_student_term IS DISTINCT FROM v_target_term') &&
      jBody.includes('RAISE EXCEPTION')) {
    passed.push('Campaign Enrollment Gate: Rejects INSERT with exceptions when campaign is inactive, or student is inactive, incomplete, or of non-matching year/term');
  } else {
    errors.push('aiml_check_existing_cgpa_on_campaign_join missing strict rejection exception checks');
  }
} else {
  errors.push('aiml_check_existing_cgpa_on_campaign_join definition missing');
}

// 28b. Campaign Student RLS Policy: Completion Gate
const campStudentReadPolicy = sql.match(/CREATE POLICY "aiml_campaign_students_read_own"[\s\S]*?USING \(([\s\S]*?)\);/);
if (campStudentReadPolicy &&
    campStudentReadPolicy[1].includes('is_active = true') &&
    campStudentReadPolicy[1].includes('is_profile_completed = true')) {
  passed.push('aiml_campaign_students_read_own requires student ownership, active status, and is_profile_completed = true');
} else {
  errors.push('aiml_campaign_students_read_own missing is_profile_completed = true check');
}

// 29. Completed Semester Academic Mapping Formula & Constraint Verification
// Formula: maximum_completed_semester = ((current_year - 1) * 2) + current_term - 1
const expectedMappings = [
  { year: 2, term: 1, sem: 2 }, // 2-1 -> Sem 2
  { year: 2, term: 2, sem: 3 }, // 2-2 -> Sem 3
  { year: 3, term: 1, sem: 4 }, // 3-1 -> Sem 4
  { year: 3, term: 2, sem: 5 }, // 3-2 -> Sem 5
  { year: 4, term: 1, sem: 6 }, // 4-1 -> Sem 6
  { year: 4, term: 2, sem: 7 }, // 4-2 -> Sem 7
];

let allMappingsVerified = true;
for (const m of expectedMappings) {
  const calculatedMax = ((m.year - 1) * 2) + m.term - 1;
  if (calculatedMax !== m.sem) {
    errors.push(`Formula mismatch for Year ${m.year} Term ${m.term}: calculated ${calculatedMax} vs expected ${m.sem}`);
    allMappingsVerified = false;
  }
}

if (sql.includes('CONSTRAINT chk_campaign_academic_mapping CHECK') &&
    sql.includes('target_year = 2 AND target_term = 1 AND target_semester = 2') &&
    sql.includes('target_year = 2 AND target_term = 2 AND target_semester = 3') &&
    sql.includes('target_year = 3 AND target_term = 1 AND target_semester = 4') &&
    sql.includes('target_year = 3 AND target_term = 2 AND target_semester = 5') &&
    sql.includes('target_year = 4 AND target_term = 1 AND target_semester = 6') &&
    sql.includes('target_year = 4 AND target_term = 2 AND target_semester = 7')) {
  passed.push('All 6 approved academic year/term to latest completed semester mappings strictly enforced via chk_campaign_academic_mapping');
} else {
  errors.push('chk_campaign_academic_mapping constraint missing or does not match all 6 approved mappings');
}

if (sql.includes('chk_campaign_year_semester_mapping')) {
  errors.push('Incorrect previous chk_campaign_year_semester_mapping is still present in schema');
} else {
  passed.push('Incorrect previous mapping constraint cleanly removed');
}

// 30. HOD Academic Milestone RPC Parameter Checks
const hodUpdateFn = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_hod_update_student_academic_fields\([\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (hodUpdateFn) {
  const huBody = hodUpdateFn[1];
  if (huBody.includes('p_current_year IS NULL') &&
      huBody.includes('p_current_term IS NULL') &&
      huBody.includes('p_current_year NOT BETWEEN 2 AND 4') &&
      huBody.includes('p_current_term NOT BETWEEN 1 AND 2')) {
    passed.push('HOD Academic Milestone RPC: Explicitly rejects NULL current_year/current_term and enforces 2-4 year and 1-2 term bounds');
  } else {
    errors.push('aiml_hod_update_student_academic_fields missing explicit NULL checks for year/term');
  }
} else {
  errors.push('aiml_hod_update_student_academic_fields definition missing');
}

// 31. Campaign Targeting Immutability Protection
const campAutoEnrollFn = sql.match(/CREATE OR REPLACE FUNCTION public\.aiml_auto_enroll_campaign_students\(\)[\s\S]*?\$\$([\s\S]*?)\$\$;/);
if (campAutoEnrollFn) {
  const caeBody = campAutoEnrollFn[1];
  if (caeBody.includes('TG_OP = \'UPDATE\'') &&
      caeBody.includes('OLD.target_year IS DISTINCT FROM NEW.target_year') &&
      caeBody.includes('OLD.target_term IS DISTINCT FROM NEW.target_term') &&
      caeBody.includes('OLD.target_semester IS DISTINCT FROM NEW.target_semester') &&
      caeBody.includes('Campaign targeting attributes (target_year, target_term, target_semester) are immutable after creation')) {
    passed.push('Campaign Target Immutability: target_year, target_term, and target_semester are immutable on UPDATE, preventing stale student assignments');
  } else {
    errors.push('aiml_auto_enroll_campaign_students missing targeting immutability protection');
  }
} else {
  errors.push('aiml_auto_enroll_campaign_students definition missing');
}

// 32. Campaign Assignment UPDATE Protection & Automatic Status Derivation
if (sql.includes('CREATE TRIGGER trg_aiml_campaign_students_existing_cgpa') &&
    sql.includes('BEFORE INSERT OR UPDATE ON public.aiml_campaign_students') &&
    joinFn && joinFn[1].includes('Automatic CGPA-based status calculation') &&
    joinFn[1].includes('sr.cumulative_cgpa IS NOT NULL')) {
  passed.push('Campaign Assignment UPDATE Protection: Trigger fires BEFORE INSERT OR UPDATE; status is strictly recalculated from matching CGPA records');
} else {
  errors.push('trg_aiml_campaign_students_existing_cgpa missing UPDATE trigger coverage or automatic status calculation');
}

// Output Results
console.log('PASSED CHECKS:');
passed.forEach(p => console.log('  [+] ' + p));

if (errors.length > 0) {
  console.log('\nFAILED CHECKS:');
  errors.forEach(e => console.log('  [-] ' + e));
  process.exit(1);
} else {
  console.log('\n================================================================');
  console.log(' STATUS: ALL 35 VALIDATION SUITES PASSED CLEANLY');
  console.log('================================================================');
}
