import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, HOD_THEME, STUDENT_THEME, getThemeConfig } from '../config/theme';

const ThemeContext = createContext({
  theme: THEMES.HOD,
  themeConfig: HOD_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
  isHod: true,
  isStudent: false,
});

export const ThemeProvider = ({ children, initialTheme = THEMES.HOD }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('aiml_portal_theme');
    return saved === THEMES.STUDENT ? THEMES.STUDENT : initialTheme;
  });

  const setTheme = (newTheme) => {
    if (newTheme === THEMES.HOD || newTheme === THEMES.STUDENT) {
      setThemeState(newTheme);
      localStorage.setItem('aiml_portal_theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === THEMES.HOD ? THEMES.STUDENT : THEMES.HOD);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const themeConfig = getThemeConfig(theme);
  const isHod = theme === THEMES.HOD;
  const isStudent = theme === THEMES.STUDENT;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeConfig,
        setTheme,
        toggleTheme,
        isHod,
        isStudent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
