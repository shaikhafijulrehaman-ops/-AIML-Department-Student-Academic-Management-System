/**
 * Centralized Institutional Branding Configuration
 * Institution: DVR & Dr. HS MIC College of Technology
 * Department: Department of Artificial Intelligence and Machine Learning (AIML)
 */

export const BRANDING = {
  collegeName: 'DVR & Dr. HS MIC College of Technology',
  departmentName: 'Department of Artificial Intelligence and Machine Learning',
  departmentAbbr: 'AIML',
  projectName: 'AIML Department Student Academic Management System',
  // Official transparent logo location in public directory
  logoPath: '/assets/branding/college-logo.png',
  rawLogoPath: '/assets/branding/college-logo-raw.png',
  hasCustomLogo: true, // Official logo supplied and integrated with background removed

  // Established motto / tagline
  tagline: 'Autonomous Institution Approved by AICTE & Permanently Affiliated to JNTUK',
  shortTagline: 'Excellence in AI & ML Engineering',

  // Locations where branding is required across the platform
  usageTargets: [
    'HOD Login Page',
    'Student Login Page',
    'HOD Dashboard Header',
    'Student Dashboard Header',
    'Floating Navigation Header',
    'Official PDF Reports',
    'Official Excel Reports'
  ]
};

export default BRANDING;
