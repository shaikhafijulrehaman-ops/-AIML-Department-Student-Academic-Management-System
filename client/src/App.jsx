import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequireAdminAuth, RequireStudentAuth } from './components/ProtectedRoute';
import { PORTAL_CONFIG } from './config/portalConfig';

// Admin / HOD Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Student Pages
import StudentLoginPage from './pages/student/StudentLoginPage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';

function PortalRouter() {
  const { isAdminAuthenticated, isStudentAuthenticated } = useAuth();
  const activePortal = PORTAL_CONFIG.currentPortalType;

  return (
    <Routes>
      {/* ========================================== */}
      {/* EXACT ADMIN / HOD PORTAL ROUTES           */}
      {/* ========================================== */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <RequireAdminAuth>
            <AdminDashboardPage />
          </RequireAdminAuth>
        }
      />

      {/* ========================================== */}
      {/* EXACT STUDENT PORTAL ROUTES                */}
      {/* ========================================== */}
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route
        path="/student/dashboard"
        element={
          <RequireStudentAuth>
            <StudentDashboardPage />
          </RequireStudentAuth>
        }
      />

      {/* Legacy / HOD Aliases */}
      <Route path="/hod/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/hod/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/hod/*" element={<Navigate to="/admin/dashboard" replace />} />

      {/* ========================================== */}
      {/* DEPLOYMENT / ALIAS BASE ROUTES             */}
      {/* ========================================== */}
      <Route
        path="/login"
        element={
          <Navigate
            to={activePortal === 'student' ? '/student/login' : '/admin/login'}
            replace
          />
        }
      />
      <Route
        path="/dashboard"
        element={
          <Navigate
            to={activePortal === 'student' ? '/student/dashboard' : '/admin/dashboard'}
            replace
          />
        }
      />

      {/* Root Path */}
      <Route
        path="/"
        element={
          activePortal === 'student' ? (
            isStudentAuthenticated ? (
              <Navigate to="/student/dashboard" replace />
            ) : (
              <Navigate to="/student/login" replace />
            )
          ) : (
            isAdminAuthenticated ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          )
        }
      />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PortalRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
