import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLOR_PALETTE, BACKGROUND_SCALES, makeBackgroundScale } from './colors';
import { readableTextOn, contrastRatio } from '../utils/color';

// 색의 "정답"은 docs/design-tokens.md의 "4. 일정 색 5가지" 표다.
const docs = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/design-tokens.md'), 'utf-8');
const section = docs.split('## 4. 일정 색 5가지')[1].split('\n## ')[0];
const docRows = [...section.matchAll(/^\|\s*(\S+)\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/gm)].map(([, name, hex]) => ({ name, value: hex.toUpperCase() }));

describe('COLOR_PALETTE (일정 색 5가지)', () => {
  it('문서의 표에서 5가지를 읽어 냈다 (표 모양이 바뀌어 시험이 아무것도 안 보게 되는 일을 막는다)', () => {
    expect(docRows).toHaveLength(5);
  });

  it('이름·값·순서가 문서의 표와 같다', () => {
    expect(COLOR_PALETTE).toEqual(docRows);
  });

  it('값은 #RRGGBB 형식이고 서로 겹치지 않는다', () => {
    const values = COLOR_PALETTE.map((c) => c.value);
    for (const v of values) expect(v).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(values).size).toBe(values.length);
  });

  it('빨강·주황 계열은 일정 색에 없다 (빨강은 삭제·경고의 뜻으로만 쓴다)', () => {
    for (const { value } of COLOR_PALETTE) {
      const n = parseInt(value.slice(1), 16);
      const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      expect(r > 200 && g < 120 && b < 120, `${value}는 빨강 계열`).toBe(false);
    }
  });

  it('모든 일정 색 위의 글자가 대비 4.5:1 이상으로 읽힌다', () => {
    for (const { value } of COLOR_PALETTE) {
      expect(contrastRatio(value, readableTextOn(value))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('BACKGROUND_SCALES (바탕 단계 색)', () => {
  const css = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.css'), 'utf-8');
  const root = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';

  it('makeBackgroundScale: 시작색(1단계)부터 끝색(5단계)까지 같은 간격으로 5단계를 만든다', () => {
    expect(makeBackgroundScale('#FFFFFF', '#000000')).toEqual(['#FFFFFF', '#BFBFBF', '#808080', '#404040', '#000000']);
  });

  it('파랑은 1단계 #FFFFFF, 5단계 #6D72FD이고 단계마다 점점 진해진다', () => {
    const blue = BACKGROUND_SCALES.blue;
    expect(blue).toEqual(['#FFFFFF', '#DBDCFF', '#B6B9FE', '#9295FE', '#6D72FD']);
  });

  // 문서의 "6. 바탕 단계 색" 아래 "### 파랑" 표가 정답이다
  const blueSection = docs.split('## 6. 바탕 단계 색')[1].split('\n## ')[0].split('### 파랑')[1].split('\n### ')[0];
  const docSteps = [...blueSection.matchAll(/^\|\s*(\d)\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/gm)].map(([, , hex]) => hex.toUpperCase());

  it('파랑 단계 값이 문서의 표와 같다', () => {
    expect(docSteps).toHaveLength(5);
    expect(BACKGROUND_SCALES.blue).toEqual(docSteps);
  });

  it('파랑 단계 값이 src/index.css의 --surface-blue-1~5와 같고, Tailwind 색 이름(bg-surface-blue-N)으로도 연결되어 있다', () => {
    BACKGROUND_SCALES.blue.forEach((hex, i) => {
      expect(root.match(new RegExp(`--surface-blue-${i + 1}:\\s*([^;]+);`))?.[1].trim()).toBe(hex.toLowerCase());
      expect(css).toContain(`--color-surface-blue-${i + 1}: var(--surface-blue-${i + 1});`);
    });
  });

  it('화면 기본 바탕은 5단계, 카드는 1단계, 은은한 면·선택·테두리는 2단계다', () => {
    const v = (name) => root.match(new RegExp(`--${name}:\\s*([^;\\s]+)`))?.[1];
    const [s1, s2, , , s5] = BACKGROUND_SCALES.blue.map((h) => h.toLowerCase());
    expect(v('background')).toBe(s5);
    expect(v('card')).toBe(s1);
    for (const name of ['muted', 'accent', 'secondary', 'selection', 'border']) expect(v(name), name).toBe(s2);
  });

  it('2단계 바탕 위의 글자(기본·흐린·휴일)는 모두 대비 4.5:1 이상이다', () => {
    const s2 = BACKGROUND_SCALES.blue[1];
    for (const fg of ['#21242E', '#5C6171', '#A64031']) {
      expect(contrastRatio(fg, s2), fg).toBeGreaterThanOrEqual(4.5);
    }
  });
});
