/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HOD Theme Palette (Executive Administrative)
        hod: {
          sage: '#D7DCCF',        // 60% Sage Fog Primary Background
          'sage-dark': '#C1C8B7',
          'sage-light': '#E8ECE2',
          claret: '#4A192B',      // 30% Claret Wine Navigation & Surfaces
          'claret-dark': '#35101E',
          'claret-light': '#63233B',
          tangerine: '#FF6B1A',   // 10% Tangerine Flash Primary Accent
          'tangerine-hover': '#E55A0E',
          'tangerine-glow': 'rgba(255, 107, 26, 0.45)',
          text: '#1E231D',
          'text-muted': '#4F584C',
        },
        // Student Theme Palette (Student Portal)
        student: {
          almond: '#E8E0CF',      // 60% Almond Milk Primary Background
          'almond-dark': '#D4CAB4',
          'almond-light': '#F5F1E8',
          teal: '#7FA8A1',        // 30% Dusty Teal Navigation & Surfaces
          'teal-dark': '#5E8881',
          'teal-light': '#9ABDB7',
          cherry: '#E8213A',      // 10% Cherry Soda Primary Accent
          'cherry-hover': '#C7152D',
          'cherry-glow': 'rgba(232, 33, 58, 0.45)',
          text: '#1F2926',
          'text-muted': '#4A5B56',
        }
      },
      boxShadow: {
        // Claymorphism Outer + Inner Shadows
        'clay-card': '8px 8px 20px rgba(0, 0, 0, 0.08), -8px -8px 20px rgba(255, 255, 255, 0.85)',
        'clay-card-hover': '12px 14px 24px rgba(0, 0, 0, 0.12), -10px -10px 24px rgba(255, 255, 255, 0.95)',
        'clay-button': '5px 5px 12px rgba(0, 0, 0, 0.12), -4px -4px 10px rgba(255, 255, 255, 0.85)',
        'clay-pressed': 'inset 3px 3px 6px rgba(0, 0, 0, 0.2), inset -2px -2px 5px rgba(255, 255, 255, 0.7)',
        'clay-sm': '4px 4px 10px rgba(0, 0, 0, 0.06), -4px -4px 10px rgba(255, 255, 255, 0.75)',
        // Glassmorphism Shadows
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-nav': '0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2)',
        'glow-tangerine': '0 0 20px 2px rgba(255, 107, 26, 0.45)',
        'glow-cherry': '0 0 20px 2px rgba(232, 33, 58, 0.45)',
      },
      keyframes: {
        'student-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-6px) scale(1.05)' },
          '60%': { transform: 'translateY(-2px) scale(0.98)' },
          '80%': { transform: 'translateY(1px) scale(1.01)' },
        },
        'spotlight-pulse': {
          '0%, 100%': { opacity: '0.9', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.08)' },
        }
      },
      animation: {
        'bounce-once': 'student-bounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spotlight-pulse': 'spotlight-pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
