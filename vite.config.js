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
    // 앱 전체를 그리는 시험은 날짜 칸 730개를 함께 그려서, 이름으로 버튼을 찾는 데만 몇 초가 걸린다.
    // 전체 시험을 한꺼번에 돌릴 때 가장 느린 시험이 약 14초(2026-11-15 측정)라서, 기본 5초 대신 그 2배쯤인 30초를 준다.
    testTimeout: 30000,
  },
})
