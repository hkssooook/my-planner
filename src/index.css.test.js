import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 이 시험은 화면 모양이 아니라 src/index.css 파일의 "내용"을 읽어서, Tailwind 4 전환 때 넣은 핵심 설정이 남아 있는지 확인한다.
// (시험 환경(jsdom)은 CSS를 적용하지 않아서, 규칙이 실제로 화면에 먹히는지는 브라우저에서 따로 확인해야 한다.)
const css = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf-8');

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

  it('Tailwind 3 색 임시 고정(@theme의 gray·blue·red 18가지)은 더 이상 없다 — 색은 모두 디자인 토큰이다', () => {
    expect(css).not.toMatch(/@theme\s*\{/);
    expect(css).not.toMatch(/--color-(gray|blue|red)-\d+:/);
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

  it('입력칸 안내 글자(placeholder)는 흐린 글자색 토큰(--muted-foreground)이다', () => {
    expect(css).toMatch(/input::placeholder[^{]*\{[^}]*color:\s*var\(--muted-foreground\)/);
  });

  it('입력칸 바탕은 카드색 토큰(--card)이고, 체크박스와 라디오는 제외한다', () => {
    expect(css).toMatch(/input:not\(\[type='checkbox'\],\s*\[type='radio'\]\)[^{]*\{[^}]*background-color:\s*var\(--card\)/);
  });
});

// 색의 "정답"은 docs/design-tokens.md의 표다. 코드(:root)가 그 표와 어긋나면 알린다.
const docs = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/design-tokens.md'), 'utf-8');
const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const rootValue = (name) => root.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe('src/index.css의 색 변수 (docs/design-tokens.md와 같아야 한다)', () => {
  // 문서의 "shadcn 변수 이름과 이 문서의 이름" 표에서 "| `--변수`, `--변수` | 이름 | `#색` |" 줄을 모두 읽는다
  const rows = [...docs.matchAll(/^\|\s*((?:`--[a-z-]+`(?:,\s*)?)+)\s*\|[^|]*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|$/gm)].flatMap(
    ([, vars, hex]) => [...vars.matchAll(/--([a-z-]+)/g)].map(([, name]) => [name, hex.toLowerCase()]),
  );

  it('문서의 표에서 변수 16개 이상을 읽어 냈다 (표 모양이 바뀌어 시험이 아무것도 안 보게 되는 일을 막는다)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(16);
  });

  it.each(rows)('--%s 는 문서의 값 %s 이다', (name, hex) => {
    expect(rootValue(name)).toBe(hex);
  });

  it('일정 색 5가지(--chart-1~5)는 문서의 블루·퍼플·핑크·앰버·민트 순서다', () => {
    const doc = ['블루', '퍼플', '핑크', '앰버', '민트'].map(
      (n) => docs.match(new RegExp('\\|\\s*' + n + '\\s*\\|\\s*`(#[0-9A-Fa-f]{6})`'))?.[1].toLowerCase(),
    );
    expect([1, 2, 3, 4, 5].map((i) => rootValue(`chart-${i}`))).toEqual(doc);
  });

  it('추가 이름(success·warning·info·holiday·selection)도 문서의 값이다', () => {
    expect(rootValue('success')).toBe('#7ac4a4');
    expect(rootValue('success-text')).toBe('#25805d');
    expect(rootValue('warning')).toBe('#fdb11a');
    expect(rootValue('info')).toBe('#3a8ced');
    expect(rootValue('holiday')).toBe('#b94737');
    expect(rootValue('selection')).toBe('#eff0fd');
  });

  it('추가 이름은 Tailwind 색 이름(bg-success 등)으로도 쓸 수 있게 연결되어 있다', () => {
    for (const name of ['success', 'warning', 'info', 'holiday', 'selection']) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
    }
  });
});

