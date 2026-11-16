import { describe, it, expect } from 'vitest';
import { contrastRatio, eventColors } from './color';

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

describe('eventColors (일정 막대·카드의 연한 바탕·짙은 글자)', () => {
  const pastels = ['#8DA5FD', '#B493FC', '#FD8AEB', '#FDCA59', '#7AC4A4'];
  const oldColors = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#A855F7', '#1D4ED8', '#000000'];

  it('바탕은 일정 색에 흰색을 72% 섞은 연한 색이다', () => {
    expect(eventColors('#8DA5FD').background).toBe('#DFE6FE');
    expect(eventColors('#000000').background).toBe('#B8B8B8');
  });

  it.each([...pastels, ...oldColors])('%s: 짙은 글자는 연한 바탕과 대비 7:1 이상이다', (color) => {
    const { background, text } = eventColors(color);
    expect(contrastRatio(background, text)).toBeGreaterThanOrEqual(7);
  });

  it('글자는 같은 색 계열이다 (검정이 아니라 일정 색을 짙게 한 색)', () => {
    expect(eventColors('#FDCA59').text).not.toBe(eventColors('#8DA5FD').text);
    expect(eventColors('#8DA5FD').text).not.toBe('#000000');
  });
});
