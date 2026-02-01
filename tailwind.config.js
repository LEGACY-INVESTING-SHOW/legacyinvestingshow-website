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
        // Legacy Investing Show - Premium Editorial Theme
        'brand': {
          // Primary Navy - Sophisticated, Trustworthy
          'navy': '#0F172A',
          'navy-light': '#1E293B',
          'navy-muted': 'rgba(15, 23, 42, 0.06)',
          
          // Gold/Amber - Premium, Success
          'gold': '#D4A853',
          'gold-light': '#E8C87A',
          'gold-dark': '#B8933F',
          'gold-muted': 'rgba(212, 168, 83, 0.12)',
          
          // Warm Cream - Elegant backgrounds
          'cream': '#FAF7F2',
          'cream-dark': '#F5F0E8',
          'white': '#FFFFFF',
          
          // Text Colors
          'text': '#0F172A',
          'text-secondary': '#334155',
          'text-muted': '#64748B',
          'text-light': '#94A3B8',
          
          // Borders
          'border': '#E2E8F0',
          'border-light': '#F1F5F9',
          'border-gold': 'rgba(212, 168, 83, 0.3)',
          
          // Semantic
          'success': '#059669',
          'success-light': '#D1FAE5',
          'error': '#DC2626',
        }
      },
      fontFamily: {
        'display': ['"DM Serif Display"', 'Georgia', 'serif'],
        'sans': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.05', fontWeight: '400', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.1', fontWeight: '400', letterSpacing: '-0.02em' }],
        'display': ['2.25rem', { lineHeight: '1.15', fontWeight: '400', letterSpacing: '-0.01em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', fontWeight: '400' }],
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
        'soft': '0 4px 24px rgba(15, 23, 42, 0.04)',
        'medium': '0 8px 32px rgba(15, 23, 42, 0.06)',
        'large': '0 16px 48px rgba(15, 23, 42, 0.08)',
        'xl': '0 24px 60px rgba(15, 23, 42, 0.1)',
        'glow': '0 0 60px rgba(212, 168, 83, 0.15)',
        'glow-sm': '0 0 30px rgba(212, 168, 83, 0.1)',
        'card': '0 4px 24px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 12px 40px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(212, 168, 83, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #D4A853 0%, #E8C87A 100%)',
        'gradient-navy': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        'gradient-cream': 'linear-gradient(180deg, #FFFFFF 0%, #FAF7F2 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 168, 83, 0.08) 0%, transparent 60%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'blob': 'blobMorph 10s ease-in-out infinite',
        'wave': 'wave 2.5s ease-in-out infinite',
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
          '0%': { opacity: '0', transform: 'scale(0.96)' },
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
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
        blobMorph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
          '75%': { borderRadius: '60% 40% 60% 30% / 70% 30% 50% 60%' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '10%': { transform: 'rotate(14deg)' },
          '20%': { transform: 'rotate(-8deg)' },
          '30%': { transform: 'rotate(14deg)' },
          '40%': { transform: 'rotate(-4deg)' },
          '50%, 100%': { transform: 'rotate(0deg)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
