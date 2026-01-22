/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./blog/**/*.html",
    "./templates/**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // Legacy Investing Show - Modern Prosperity palette
        'brand': {
          'gold': '#D4A853',           // Primary gold accent
          'gold-light': '#E8C97A',     // Light gold for hover
          'gold-dark': '#B8923D',      // Darker gold
          'gold-muted': 'rgba(212, 168, 83, 0.15)', // Subtle gold overlay
          'cream': '#F5F0E6',          // Warm cream for contrast text
          'dark': '#0C0C0E',           // Rich black background
          'darker': '#060608',         // Darkest sections
          'card': '#141416',           // Card backgrounds
          'card-elevated': '#1A1A1D',  // Elevated cards
          'border': '#2A2A2E',         // Subtle borders
          'border-light': '#3A3A3E',   // Lighter borders
          'text': '#FFFFFF',           // Primary text
          'text-muted': '#A8A8B3',     // Secondary text
          'text-dim': '#6B6B75',       // Dimmed text
          // Keep green as secondary
          'success': '#10B981',
          'success-dark': '#059669',
        }
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'Georgia', 'serif'],
        'sans': ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['5rem', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.02em' }],
        'display-lg': ['4rem', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' }],
        'display': ['3rem', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.01em' }],
        'display-sm': ['2.25rem', { lineHeight: '1.2', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow': '0 0 60px rgba(212, 168, 83, 0.15)',
        'glow-sm': '0 0 30px rgba(212, 168, 83, 0.1)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #D4A853 0%, #E8C97A 50%, #D4A853 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0C0C0E 0%, #060608 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.7s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.7s ease-out forwards',
        'scale-in': 'scaleIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
