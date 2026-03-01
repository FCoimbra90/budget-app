import type { Config } from 'tailwindcss'

export default {
  content: ['./client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        income: '#16a34a',
        expense: '#dc2626',
        internal: '#6b7280',
      },
    },
  },
  plugins: [],
} satisfies Config
