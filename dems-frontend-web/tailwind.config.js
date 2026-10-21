export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F7F8FA',
        card: '#FFFFFF',
        ink: {
          DEFAULT: '#172033',
          muted: '#64748B',
          faint: '#94A3B8'
        },
        brand: {
          DEFAULT: '#3867D6',
          hover: '#2F56B3',
          soft: '#EEF4FF',
          ring: 'rgba(56, 103, 214, 0.18)'
        },
        success: {
          DEFAULT: '#168568',
          soft: '#E9F7F1'
        },
        warn: {
          DEFAULT: '#B7791F',
          soft: '#FFF6E5'
        },
        danger: {
          DEFAULT: '#DC4545',
          soft: '#FDEEEE'
        },
        line: '#E6E8EC',
        surface: '#F1F3F5'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Mono"', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      fontSize: {
        page: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        section: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        meta: ['0.75rem', { lineHeight: '1rem' }]
      },
      borderRadius: {
        card: '12px',
        control: '9px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
        pop: '0 12px 32px -8px rgba(16, 24, 40, 0.16), 0 2px 6px rgba(16, 24, 40, 0.05)',
        focus: '0 0 0 3px rgba(56, 103, 214, 0.18)'
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
        shimmer: 'shimmer 1.6s infinite'
      }
    }
  },
  plugins: []
};
