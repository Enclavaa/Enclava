/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Hashgraph-inspired color palette
        hashgraph: {
          purple: '#8B5CF6',
          violet: '#A855F7',
          cyan: '#06B6D4',
          teal: '#14B8A6',
        },
      },
    },
  },
  plugins: [],
};
