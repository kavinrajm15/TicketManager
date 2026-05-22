/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false, // Enforces your single light theme
  theme: {
    extend: {
      colors: {
        primary: '#0052CC', // Jira-style Blue
        surface: '#FFFFFF', // Card backgrounds
        background: '#F4F5F7', // Main app background
        textMain: '#172B4D', // Primary text
        textMuted: '#5E6C84', // Secondary text
        danger: '#FF5630', // Destructive actions
        success: '#36B37E', // Done status
        warning: '#FFAB00', // In-progress status
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}