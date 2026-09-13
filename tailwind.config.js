/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./blog/**/*.html",
    "./blog/page/*.html",
    "./compare/**/*.html",
    "./cms/_includes/**/*.njk",
    "./templates/**/*.html",
    "./assets/js/**/*.js",
    "./tax-strategies/**/*.html",
    "./retirement/**/*.html",
    "./topics/**/*.html",
    "./markets/**/*.html",
    "./renters-insurance/**/*.html",
    "./404.html"
  ],
  theme: {
    extend: {
      colors: {
        // Tailwind default colors still referenced by pages
        'emerald': {
          100: '#D1FAE5',
          600: '#059669',
          800: '#065F46',
        },
        'gray': {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          700: '#374151',
        },
        'slate': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        'cyan': {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        'green': {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        // Legacy Investing Show — see DESIGN.md
        'brand': {
          'navy': '#0F172A',
          'navy-light': '#1E293B',
          'navy-muted': 'rgba(15, 23, 42, 0.06)',

          // Gold for rules and fills; gold-text for gold as text on cream/white
          'gold': '#C9A961',
          'gold-light': '#D9C48A',
          'gold-dark': '#A88B4A',
          'gold-text': '#8A6F35',
          'gold-muted': 'rgba(201, 169, 97, 0.10)',

          'cream': '#FAF7F2',
          'cream-dark': '#F5F0E8',
          'white': '#FFFFFF',

          'text': '#0F172A',
          'text-secondary': '#334155',
          'text-muted': '#64748B',
          'on-navy': '#CBD5E1',

          'border': '#E2E8F0',
          'border-light': '#F1F5F9',
          'border-gold': 'rgba(201, 169, 97, 0.35)',

          'success': '#047857',
          'error': '#DC2626',
        }
      },
      fontFamily: {
        'display': ['"DM Serif Display"', 'Georgia', 'serif'],
        'sans': ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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
        'card': '0 4px 24px rgba(15, 23, 42, 0.04)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-navy': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        'gradient-cream': 'linear-gradient(180deg, #FFFFFF 0%, #FAF7F2 100%)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
