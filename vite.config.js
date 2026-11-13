import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // 브라우저를 흉내 내는 환경에서 시험한다
    setupFiles: ['./src/test/setup.js'],
  },
})
