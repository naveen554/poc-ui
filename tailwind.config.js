export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1F3B73',
          50: '#F2F5FA',
          100: '#E3E9F3',
          600: '#2A4A86',
          700: '#1F3B73',
          800: '#182F5C',
          900: '#122246',
        },
        canvas: '#F4F6F9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', '1rem'],
      },
    },
  },
}
