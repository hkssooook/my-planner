import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // scripts/ 는 브라우저가 아니라 Node(내 컴퓨터)에서 도는 도구 스크립트다
    files: ['scripts/**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    // src/components/ui 는 shadcn CLI가 만들어 주는 파일이다. 직접 고치면 shadcn을 갱신할 때 충돌하므로 검사 규칙을 완화한다.
    //  - Button과 buttonVariants를 함께 내보내는 것이 shadcn의 표준 구조라서 fast-refresh 규칙을 끈다
    //  - TypeScript를 JavaScript로 변환하면서 남은 쓰지 않는 'React' import는 허용한다
    files: ['src/components/ui/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
    },
  },
])
