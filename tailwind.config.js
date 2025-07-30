/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Mobile-first breakpoints
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
      // Touch-friendly spacing
      spacing: {
        'touch': '44px', // Minimum touch target size
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // Mobile-optimized font sizes
      fontSize: {
        'xs-mobile': ['12px', '16px'],
        'sm-mobile': ['14px', '20px'],
        'base-mobile': ['16px', '24px'],
        'lg-mobile': ['18px', '28px'],
        'xl-mobile': ['20px', '32px'],
      }
    },
  },
  plugins: [],
}