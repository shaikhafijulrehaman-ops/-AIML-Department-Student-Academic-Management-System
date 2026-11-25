import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_STUDENTS, INITIAL_UPDATE_REQUESTS, getMaxCompletedSemForTerm } from '../data/mockData';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  STUDENTS: 'aiml_shared_students_data',
  REQUESTS: 'aiml_shared_update_requests',
  AUTH_ROLE: 'aiml_auth_role',
  ACTIVE_STUDENT_ID: 'aiml_active_student_id',
};

const sanitizeRequestText = (str) => {
  if (!str) return '';
  return str
    .replace(/sgpa\s*(and|&)\s*cgpa/gi, 'CGPA')
    .replace(/cgpa\s*(and|&)\s*sgpa/gi, 'CGPA')
    .replace(/\bsgpa\b/gi, 'CGPA')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeRequestsList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(req => ({
    ...req,
    title: sanitizeRequestText(req.title),
    instructions: sanitizeRequestText(req.instructions),
  }));
};

const sanitizeStudentsList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(s => ({
    ...s,
    semesterRecords: (s.semesterRecords || []).map(r => {
      const { sgpa, ...cleanRecord } = r;
      return cleanRecord;
    })
  }));
};

export const AuthProvider = ({ children }) => {
  // Demo authenticated role: 'admin' | 'student' | null
  const [currentRole, setCurrentRole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_ROLE) || null;
  });

  // HOD Profile
  const [hodUser] = useState({
    name: 'Dr. K. Srinivas Rao',
    title: 'Professor & Head of Department',
    department: 'Department of Artificial Intelligence and Machine Learning',
    email: 'hod.aiml@mictech.ac.in',
    cabin: 'Room #204, Tech Block',
    role: 'Head of Department'
  });

  // All department students loaded from localStorage or initialized with INITIAL_STUDENTS
  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeStudentsList(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading students from localStorage', e);
    }
    return INITIAL_STUDENTS;
  });

  // Active HOD update requests loaded from localStorage
  const [updateRequests, setUpdateRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeRequestsList(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading requests from localStorage', e);
    }
    return INITIAL_UPDATE_REQUESTS;
  });

  // Active logged-in student id (defaults to 'std_1' = K. Sai Krishna)
  const [activeStudentId, setActiveStudentId] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT_ID) || 'std_1';
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.error('Failed to sync students to localStorage', e);
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updateRequests));
    } catch (e) {
      console.error('Failed to sync requests to localStorage', e);
    }
  }, [updateRequests]);

  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];

  const loginAsAdmin = (email, password) => {
    if (email && password) {
      setCurrentRole('admin');
      localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'admin');
      return { success: true };
    }
    return { success: false, error: 'Please enter valid credentials.' };
  };

  const loginAsStudent = (registerNumber, password) => {
    if (!registerNumber || !password) {
      return { success: false, error: 'Please enter Register Number and Password.' };
    }
    const matched = students.find(
      (s) => s.registerNumber.trim().toUpperCase() === registerNumber.trim().toUpperCase()
    );
    const target = matched || students[0];

    setCurrentRole('student');
    setActiveStudentId(target.id);
    localStorage.setItem(STORAGE_KEYS.AUTH_ROLE, 'student');
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT_ID, target.id);
    return { success: true, student: target };
  };

  const logout = () => {
    setCurrentRole(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
  };

  /**
   * Student Profile update:
   * Only called when explicit "Save Changes" is clicked.
   */
  const updateStudentProfile = (studentId, updatedFields) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          ...updatedFields,
        };
      })
    );
  };

  /**
   * Student Academic Details update:
   * Only called when explicit "Save Academic Details" is clicked.
   */
  const updateStudentAcademicDetails = (studentId, { sscPercentage, interType, interPercentage, semesterRecords }) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          sscPercentage: parseFloat(sscPercentage) || s.sscPercentage,
          interType: interType || s.interType,
          interPercentage: parseFloat(interPercentage) || s.interPercentage,
          semesterRecords: semesterRecords || s.semesterRecords,
        };
      })
    );
  };

  /**
   * HOD creates a year-specific update request
   */
  const createYearSpecificUpdateRequest = ({ title, targetYear, targetSemester, instructions }) => {
    const newReq = {
      id: `req_${Date.now()}`,
      title: title.trim(),
      targetYear,
      targetSemester,
      instructions: instructions ? instructions.trim() : 'Please update your official semester grades.',
      createdAt: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: 'Active',
    };
    setUpdateRequests((prev) => [newReq, ...prev]);
    return newReq;
  };

  /**
   * Checks whether a student has submitted the requested record for a specific request.
   * A student is SUBMITTED if they belong to targetYear AND have valid non-null CGPA for targetSemester!
   */
  const isStudentSubmittedForRequest = (student, request) => {
    if (!student || !request) return false;
    if (student.year !== request.targetYear) return false;

    const record = (student.semesterRecords || []).find((r) => r.term === request.targetSemester);
    return Boolean(record && record.cgpa !== null && record.status === 'Updated');
  };

  // Helper to switch active student (for testing different students)
  const switchDemoStudent = (id) => {
    const target = students.find((s) => s.id === id);
    if (target) {
      setActiveStudentId(target.id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT_ID, target.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentRole,
        isAdminAuthenticated: currentRole === 'admin',
        isStudentAuthenticated: currentRole === 'student',
        hodUser,
        activeStudent,
        students,
        updateRequests,
        loginAsAdmin,
        loginAsStudent,
        logout,
        updateStudentProfile,
        updateStudentAcademicDetails,
        createYearSpecificUpdateRequest,
        isStudentSubmittedForRequest,
        switchDemoStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
