import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route protection for Admin / HOD Portal
 * Redirects to /login if not authenticated as Admin.
 */
export const RequireAdminAuth = ({ children }) => {
  const { isAdminAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Route protection for Student Portal
 * Redirects to /student/login if not authenticated as Student.
 */
export const RequireStudentAuth = ({ children }) => {
  const { isStudentAuthenticated } = useAuth();
  const location = useLocation();

  if (!isStudentAuthenticated) {
    return <Navigate to="/student/login" state={{ from: location }} replace />;
  }

  return children;
};

export default { RequireAdminAuth, RequireStudentAuth };
