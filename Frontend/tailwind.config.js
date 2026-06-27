/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2BB673",
        softGreenBg: "#EAF7F1",
        cardSurface: "#FFFFFF",
        textPrimary: "#1E293B",
        textMuted: "#64748B",
        borderSoft: "#EEF2F6",
        pageBg: "#F6F8FA"
      },
      borderRadius: {
        "xl-soft": "20px"
      },
      boxShadow: {
        card: "0px 10px 30px rgba(16, 24, 40, 0.05)"
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

