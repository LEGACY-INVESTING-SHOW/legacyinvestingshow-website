/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./about/**/*.html",
    "./cms/_includes/**/*.njk",
    "./templates/**/*.html",
    "./scripts/**/*.js",
    "./assets/js/**/*.js",
    "./tax-strategies/**/*.html",
    "./retirement/**/*.html",
    "./topics/**/*.html",
    "./tools/**/*.html",
    "./compare/**/*.html",
    "./alternatives/**/*.html",
    "./vs/**/*.html"
  ],
  // Utilities used inside blog markdown bodies, which Tailwind does not scan
  // (tests/build-chain.test.js keeps ./blog out of `content` on purpose).
  safelist: ["my-8", "invisible", "top-10", "isolate", "ring"],
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
        // Legacy Investing Show — see DESIGN.md (field guide palette)
        'brand': {
          'paper': '#FBF8F1',
          'ivory': '#F3EDDF',
          'line': '#DDD4BE',
          'ink': '#1F2A24',
          'ink-soft': '#4A5850',
          'ink-faint': '#7D877F',
          'forest': '#16352A',
          'forest-hover': '#0F2419',
          'emerald': '#2F7D5B',
          'emerald-deep': '#246247',
          'emerald-tint': '#E4EFE5',
          'gold': '#D9A93D',
          'gold-hover': '#C4952C',
          'gold-ink': '#8A6510',
          'gold-tint': '#F6ECD3',
          'rose': '#B0503C',
          'rose-tint': '#F6E4DD',
          'on-forest': '#EAF0EA',
          'on-forest-strong': '#FBF8F1',
          'on-forest-faint': '#B9C8BB',

          // Older names still referenced by pages not yet rebuilt
          'navy': '#16352A',
          'navy-light': '#1E4234',
          'cream': '#FBF8F1',
          'cream-dark': '#F3EDDF',
          'white': '#FBF8F1',
          'gold-light': '#E8C877',
          'gold-dark': '#C4952C',
          'gold-text': '#8A6510',
          'text': '#1F2A24',
          'text-secondary': '#4A5850',
          'text-muted': '#7D877F',
          'on-navy': '#EAF0EA',
          'border': '#DDD4BE',
          'border-light': '#EBE4D4',
          'success': '#246247',
          'error': '#B0503C',
        }
      },
      fontFamily: {
        'sans': ['"Public Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        'display': ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.015em' }],
        'display-lg': ['2.5rem', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.015em' }],
        'display': ['1.875rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'display-sm': ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
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
        // The field guide has no shadows. These resolve to none so any
        // page not yet rebuilt loses its shadow instead of keeping it.
        'soft': 'none',
        'medium': 'none',
        'large': 'none',
        'xl': 'none',
        'card': 'none',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
