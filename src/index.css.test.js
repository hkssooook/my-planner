import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 이 시험은 화면 모양이 아니라 src/index.css 파일의 "내용"을 읽어서, Tailwind 4 전환 때 넣은 핵심 설정이 남아 있는지 확인한다.
// (시험 환경(jsdom)은 CSS를 적용하지 않아서, 규칙이 실제로 화면에 먹히는지는 브라우저에서 따로 확인해야 한다.)
const css = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf-8');

// 전환 전(Tailwind 3)에 이 앱이 쓰던 색 18가지의 값
const PINNED_COLORS = {
  'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db', 'gray-400': '#9ca3af',
  'gray-500': '#6b7280', 'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937', 'gray-900': '#111827',
  'blue-50': '#eff6ff', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb',
  'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-600': '#dc2626', 'red-700': '#b91c1c',
};

describe('src/index.css (Tailwind 4 설정)', () => {
  it('Tailwind를 불러오되, 파일을 자동으로 훑지 않는다 (source(none))', () => {
    expect(css).toMatch(/@import\s+['"]tailwindcss['"]\s+source\(none\)/);
  });

  it('클래스 이름은 앱 코드(index.html과 src)에서만 찾는다', () => {
    expect(css).toContain('@source "../index.html"');
    expect(css).toContain('@source "."');
  });

  it('시험 파일은 클래스를 찾는 대상에서 제외한다 (시험 코드의 단어가 배포용 CSS에 섞이지 않게)', () => {
    expect(css).toContain('@source not "./**/*.test.{js,jsx}"');
    expect(css).toContain('@source not "./test"');
  });

  it('이 앱이 쓰는 색 18가지를 Tailwind 3의 값으로 고정하고 있다', () => {
    const theme = css.match(/@theme\s*\{([^}]*)\}/)?.[1] ?? '';
    for (const [name, hex] of Object.entries(PINNED_COLORS)) {
      expect(theme, `--color-${name}`).toContain(`--color-${name}: ${hex};`);
    }
  });

  it('고정한 색이 앱이 쓰는 색 목록과 정확히 같은 개수다 (하나라도 빠지거나 늘면 알린다)', () => {
    const theme = css.match(/@theme\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(theme.match(/--color-[a-z]+-\d+:/g)).toHaveLength(Object.keys(PINNED_COLORS).length);
  });

  it('shadcn 기본 규칙: 모든 요소의 테두리 색은 --border 변수를 따른다', () => {
    expect(css).toMatch(/\*\s*\{\s*@apply\s+border-border\s+outline-ring\/50;/);
  });

  it('shadcn 기본 규칙: 바탕과 글자는 --background, --foreground 변수를 따른다', () => {
    expect(css).toMatch(/body\s*\{\s*@apply\s+bg-background\s+text-foreground;/);
  });

  it('shadcn 기본 테마(neutral) 변수가 있다', () => {
    for (const name of ['background', 'foreground', 'primary', 'secondary', 'muted', 'accent', 'destructive', 'border', 'input', 'ring', 'radius']) {
      expect(css, `--${name}`).toMatch(new RegExp(`:root\\s*\\{[^}]*--${name}:`));
    }
  });

  it('shadcn 전용 Tailwind 규칙(복사해 온 shadcn.css)을 불러온다', () => {
    expect(css).toContain('@import "./shadcn.css"');
    expect(fs.existsSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'shadcn.css'))).toBe(true);
  });

  it('버튼 위에서 손가락 모양 커서를 유지한다', () => {
    expect(css).toMatch(/button:not\(:disabled\)[^{]*\{[^}]*cursor:\s*pointer/);
  });

  it('입력칸 안내 글자(placeholder)를 회색(gray-400)으로 유지한다', () => {
    expect(css).toMatch(/input::placeholder[^{]*\{[^}]*color:\s*var\(--color-gray-400\)/);
  });

  it('입력칸 바탕은 흰색이고, 체크박스와 라디오는 제외한다', () => {
    expect(css).toMatch(/input:not\(\[type='checkbox'\],\s*\[type='radio'\]\)[^{]*\{[^}]*background-color:\s*#fff/);
  });
});
