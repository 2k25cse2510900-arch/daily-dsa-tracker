/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#ebe6f0',
          surface: '#f7f3f9',
          card: '#ffffff',
          cardHover: '#f2edf6',
          border: '#dbcee2',
          borderActive: '#7544ae',
          text: '#261b35',
          textMuted: '#766c83',
          accentPurple: '#7544ae',
          accentCyan: '#0ea5e9',
          accentBlue: '#3b82f6',
          accentPink: '#b34487',
          gold: '#c88832',
        },
        rarity: {
          common: '#64748b',
          rare: '#0284c7',
          epic: '#7e22ce',
          legendary: '#b45309',
        }
      },
      boxShadow: {
        'glow-cyan':   '0 0 20px -3px rgba(14, 165, 233, 0.35)',
        'glow-purple': '0 0 20px -3px rgba(117, 68, 174, 0.35)',
        'glow-gold':   '0 0 20px -3px rgba(200, 136, 50, 0.35)',
      },
      fontFamily: {
        game: ['Outfit', 'Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'studio-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'studio-float': 'studio-float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
