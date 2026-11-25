/**
 * Centralized Design System Themes
 * Strict Rule: Never mix HOD and Student palettes.
 */

export const THEMES = {
  HOD: 'hod',
  STUDENT: 'student',
};

export const HOD_THEME = {
  id: 'hod',
  name: 'HOD Admin Theme',
  description: 'Executive administrative aesthetic with Sage Fog, Claret Wine, and Tangerine Flash accents.',
  proportions: {
    background: '60%',
    surfaces: '30%',
    accents: '10%',
  },
  colors: {
    // 60% Primary background
    sage: '#D7DCCF',
    // 30% Navigation and important surfaces
    claret: '#4A192B',
    // 10% Primary accents
    tangerine: '#FF6B1A',
    
    // Derived accessible tints & shades
    sageDark: '#C1C8B7',
    sageLight: '#E8ECE2',
    claretDark: '#35101E',
    claretLight: '#63233B',
    claretGlass: 'rgba(74, 25, 43, 0.88)',
    tangerineHover: '#E55A0E',
    tangerineGlow: 'rgba(255, 107, 26, 0.45)',

    // Readable text colors
    textPrimary: '#1E231D',
    textSecondary: '#4F584C',
    textMuted: '#74806F',
    textOnClaret: '#F7F5EE',
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shadows: {
    clayCard: '10px 10px 20px rgba(74, 25, 43, 0.12), -8px -8px 20px rgba(255, 255, 255, 0.85)',
    clayButton: '6px 6px 14px rgba(74, 25, 43, 0.15), -4px -4px 12px rgba(255, 255, 255, 0.9)',
    clayPressed: 'inset 4px 4px 8px rgba(74, 25, 43, 0.2), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
  }
};

export const STUDENT_THEME = {
  id: 'student',
  name: 'Student Portal Theme',
  description: 'Approachable tactile aesthetic with Almond Milk, Dusty Teal, and Cherry Soda accents.',
  proportions: {
    background: '60%',
    surfaces: '30%',
    accents: '10%',
  },
  colors: {
    // 60% Primary background
    almond: '#E8E0CF',
    // 30% Navigation and secondary surfaces
    teal: '#7FA8A1',
    // 10% Primary accents
    cherry: '#E8213A',

    // Derived accessible tints & shades
    almondDark: '#D4CAB4',
    almondLight: '#F5F1E8',
    tealDark: '#5E8881',
    tealLight: '#9ABDB7',
    tealGlass: 'rgba(127, 168, 161, 0.88)',
    cherryHover: '#C7152D',
    cherryGlow: 'rgba(232, 33, 58, 0.45)',

    // Readable text colors
    textPrimary: '#1F2926',
    textSecondary: '#4A5B56',
    textMuted: '#718580',
    textOnTeal: '#FFFFFF',
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shadows: {
    clayCard: '10px 10px 20px rgba(94, 136, 129, 0.15), -8px -8px 20px rgba(255, 255, 255, 0.9)',
    clayButton: '6px 6px 14px rgba(94, 136, 129, 0.2), -4px -4px 12px rgba(255, 255, 255, 0.9)',
    clayPressed: 'inset 4px 4px 8px rgba(94, 136, 129, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.7)',
  }
};

export const getThemeConfig = (themeId) => {
  return themeId === THEMES.STUDENT ? STUDENT_THEME : HOD_THEME;
};
