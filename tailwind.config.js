/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 모든 JSX 파일을 감시하도록 설정
  ],
  theme: {
    extend: {
      colors: {
        // 이미지에 쓰인 색상들을 커스텀 컬러로 등록하면 편합니다.
        'yt-dark': '#0f0f0f',
        'yt-card': '#1e1e1e',
        'yt-red': '#ff0000',
      }
    },
  },
  plugins: [],
}