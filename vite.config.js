import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // '@/components/...' 처럼 src 폴더를 '@'로 짧게 가리킨다 (shadcn이 이 방식으로 파일을 불러온다)
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom', // 브라우저를 흉내 내는 환경에서 시험한다
    setupFiles: ['./src/test/setup.js'],
  },
})
