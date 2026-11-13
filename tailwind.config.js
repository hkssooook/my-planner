/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // 시험 파일은 앱에 들어가지 않으므로 CSS를 만들 때 훑지 않는다.
    // (훑으면 시험 코드의 변수 이름 등이 스타일 이름으로 오해되어 배포용 CSS가 불필요하게 늘어난다)
    "!./src/**/*.test.{js,jsx}",
    "!./src/test/**",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}