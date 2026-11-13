import { describe, it, expect } from 'vitest';
import { contrastRatio, readableTextOn, DARK_TEXT, LIGHT_TEXT } from './color';

describe('contrastRatio (글자 대비 계산)', () => {
  it('검정과 흰색은 21:1이다', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('같은 색끼리는 1:1이다', () => {
    expect(contrastRatio('#5A68EC', '#5A68EC')).toBeCloseTo(1, 5);
  });

  it('순서를 바꿔도 같다', () => {
    expect(contrastRatio('#21242E', '#FDCA59')).toBeCloseTo(contrastRatio('#FDCA59', '#21242E'), 10);
  });

  it('디자인 토큰 문서의 계산값과 맞다 (기본 글자 #21242E 대 흰색 = 15.48)', () => {
    expect(contrastRatio('#21242E', '#FFFFFF')).toBeCloseTo(15.48, 1);
  });
});

describe('readableTextOn (일정 색 위의 글자색)', () => {
  it.each(['#8DA5FD', '#B493FC', '#FD8AEB', '#FDCA59', '#7AC4A4'])('파스텔 일정 색 %s 위에는 진한 글자를 쓴다', (bg) => {
    expect(readableTextOn(bg)).toBe(DARK_TEXT);
  });

  it.each(['#000000', '#1F2937', '#1D4ED8'])('아주 어두운 색 %s 위에는 흰 글자를 쓴다', (bg) => {
    expect(readableTextOn(bg)).toBe(LIGHT_TEXT);
  });

  it('예전 진한 일정 색(파랑·초록·주황·빨강·보라) 위에서도 더 잘 읽히는 쪽을 고른다', () => {
    for (const bg of ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#A855F7']) {
      const chosen = readableTextOn(bg);
      const other = chosen === DARK_TEXT ? LIGHT_TEXT : DARK_TEXT;
      expect(contrastRatio(bg, chosen)).toBeGreaterThanOrEqual(contrastRatio(bg, other));
    }
  });

  it('문서의 일정 색 5가지는 모두 글자 대비 4.5:1 이상이다', () => {
    for (const bg of ['#8DA5FD', '#B493FC', '#FD8AEB', '#FDCA59', '#7AC4A4']) {
      expect(contrastRatio(bg, readableTextOn(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
