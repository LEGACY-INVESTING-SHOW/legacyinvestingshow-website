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
        // Legacy Investing Show - Premium Finance Light Theme
        'brand': {
          // Primary Green (Finance/Growth)
          'primary': '#059669',           // Emerald 600 - main brand color
          'primary-light': '#10B981',     // Emerald 500 - lighter accent
          'primary-dark': '#047857',      // Emerald 700 - darker shade
          'primary-muted': 'rgba(5, 150, 105, 0.08)', // Subtle green overlay

          // Accent Gold (Premium/Success)
          'accent': '#CA8A04',            // Yellow 600 - premium accent
          'accent-light': '#EAB308',      // Yellow 500

          // Light Theme Backgrounds
          'white': '#FFFFFF',             // Pure white
          'light': '#FAFAFA',             // Off-white sections
          'cream': '#F5F5F4',             // Warm gray for contrast
          'muted': '#F3F4F6',             // Gray 100 - subtle sections

          // Card & Surface Colors
          'card': '#FFFFFF',              // Card backgrounds
          'card-hover': '#F9FAFB',        // Card hover state

          // Borders
          'border': '#E5E7EB',            // Gray 200 - standard borders
          'border-light': '#F3F4F6',      // Gray 100 - subtle borders
          'border-dark': '#D1D5DB',       // Gray 300 - emphasis borders

          // Text Colors
          'text': '#111827',              // Gray 900 - primary text
          'text-secondary': '#374151',    // Gray 700 - secondary text
          'text-muted': '#6B7280',        // Gray 500 - muted text
          'text-dim': '#9CA3AF',          // Gray 400 - very light text

          // Semantic Colors
          'success': '#059669',
          'success-light': '#D1FAE5',
          'error': '#DC2626',
          'warning': '#F59E0B',
        }
      },
      fontFamily: {
        'display': ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        'sans': ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display': ['2.75rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'display-sm': ['2rem', { lineHeight: '1.25', fontWeight: '600' }],
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
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.06)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'xl': '0 16px 48px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 40px rgba(5, 150, 105, 0.15)',
        'glow-sm': '0 0 20px rgba(5, 150, 105, 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(5, 150, 105, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
        'gradient-light': 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(5, 150, 105, 0.08) 0%, transparent 60%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
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
