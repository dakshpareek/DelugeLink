export default {
  content: ['./popup.html', './options.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        deluge: {
          dark: '#1a1a1a',
          darker: '#0f0f0f',
          accent: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        }
      }
    }
  },
  plugins: [],
};
