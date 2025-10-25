/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Earth tones - dark, natural palette
        earth: {
          50: '#f8f6f3',   // Lightest sand
          100: '#e8e4dc',  // Light sand
          200: '#d4cfc4',  // Sand
          300: '#b8b0a1',  // Warm gray
          400: '#9a8f7e',  // Dark sand
          500: '#7d6f5c',  // Brown earth
          600: '#5d5344',  // Dark brown
          700: '#4a4136',  // Deep brown
          800: '#3a342c',  // Charcoal brown
          900: '#2a2621',  // Almost black
        },
        forest: {
          50: '#f0f4f0',
          100: '#d9e5d9',
          200: '#b8d1b8',
          300: '#8fb88f',
          400: '#6a9d6a',
          500: '#4a7c4a',  // Deep forest green
          600: '#3d6e3d',  // Balanced mid-green
          700: '#2d5016',  // Primary brand green (olive)
          800: '#1f3810',
          900: '#14260b',
        },
        stone: {
          50: '#f5f5f4',
          100: '#e7e5e4',
          200: '#d6d3d1',
          300: '#a8a29e',
          400: '#78716c',
          500: '#57534e',  // Warm stone
          600: '#44403c',
          700: '#292524',
          800: '#1c1917',
          900: '#0c0a09',
        },
        sunset: {
          400: '#f59e0b',  // Warm orange
          500: '#d97706',  // Deep orange
          600: '#b45309',  // Burnt orange
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Playfair Display', 'serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      boxShadow: {
        'earth': '0 4px 6px -1px rgba(42, 38, 33, 0.3), 0 2px 4px -1px rgba(42, 38, 33, 0.2)',
        'forest': '0 4px 6px -1px rgba(45, 80, 22, 0.3), 0 2px 4px -1px rgba(45, 80, 22, 0.2)',
      }
    },
  },
  plugins: [],
}