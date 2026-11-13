import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLOR_PALETTE } from './colors';
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
