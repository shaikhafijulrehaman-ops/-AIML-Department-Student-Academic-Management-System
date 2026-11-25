/**
 * Portal Deployment Configuration
 * Supports two independent Vercel deployments:
 * 1. Admin/HOD Portal: VITE_PORTAL_TYPE=admin (e.g. https://aiml-hod.vercel.app)
 * 2. Student Portal: VITE_PORTAL_TYPE=student (e.g. https://aiml-students.vercel.app)
 */

const getInitialPortalType = () => {
  // Check build-time environment variable
  const envType = import.meta.env.VITE_PORTAL_TYPE;
  if (envType === 'admin' || envType === 'student') {
    return envType;
  }
  // During local development or testing when unset, read from localStorage or default to 'admin'
  const saved = localStorage.getItem('aiml_dev_portal_type');
  if (saved === 'admin' || saved === 'student') {
    return saved;
  }
  return 'admin';
};

export const PORTAL_CONFIG = {
  envPortalType: import.meta.env.VITE_PORTAL_TYPE || null,
  isBuildLocked: Boolean(import.meta.env.VITE_PORTAL_TYPE),
  currentPortalType: getInitialPortalType(),
};

export const setDevPortalType = (type) => {
  if (type === 'admin' || type === 'student') {
    localStorage.setItem('aiml_dev_portal_type', type);
    window.location.reload();
  }
};

export default PORTAL_CONFIG;
