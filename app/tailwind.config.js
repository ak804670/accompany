const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.ts', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    borderRadius: {
      DEFAULT: '8px',
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '12px',
      '2xl': '12px',
      full: '999px',
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        coin: 'hsl(var(--coin))',
        online: 'hsl(var(--online))',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontFamily: {
        'inter-regular': ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
        'newsreader-regular': ['Newsreader_400Regular'],
        'newsreader-medium': ['Newsreader_500Medium'],
      },
      fontSize: {
        display: ['40px', { lineHeight: '48px', letterSpacing: '-0.4px' }],
        h1: ['32px', { lineHeight: '40px', letterSpacing: '-0.3px' }],
        h2: ['26px', { lineHeight: '34px', letterSpacing: '-0.2px' }],
        h3: ['20px', { lineHeight: '28px' }],
        'body-l': ['17px', { lineHeight: '26px' }],
        'body-m': ['15px', { lineHeight: '22px' }],
        'body-s': ['13px', { lineHeight: '18px' }],
        label: ['13px', { lineHeight: '18px', letterSpacing: '0.2px' }],
        caption: ['11px', { lineHeight: '16px', letterSpacing: '0.6px' }],
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
