import { describe, it, expect } from 'vitest';
import { countChanges } from './changes';

const evt = (id, title = '일정', extra = {}) => ({ id, title, start_date: '2026-01-05', end_date: '2026-01-05', color: '#8DA5FD', ...extra });
const block = (id, content = '회의', extra = {}) => ({ id, start: '09:00', end: '10:00', content, color: '#8DA5FD', is_important: false, ...extra });

describe('countChanges (저장 안 한 변경 개수)', () => {
  it('같으면 0개다. 속성 순서가 달라도, 빈 날짜 목록이 있어도 같다', () => {
    const saved = { events: [evt(1)], timeBlocks: { '2026-01-05': [block('a')] } };
    const working = {
      events: [{ color: '#8DA5FD', end_date: '2026-01-05', start_date: '2026-01-05', title: '일정', id: 1 }],
      timeBlocks: { '2026-01-05': [block('a')], '2026-01-06': [] },
    };
    expect(countChanges(saved, working)).toBe(0);
  });

  it('새로 생긴 것, 지운 것, 고친 것을 일정 하나당 1개로 센다', () => {
    const saved = { events: [evt(1), evt(2)], timeBlocks: { '2026-01-05': [block('a'), block('b')] } };
    const working = {
      events: [evt(1, '바뀐 이름'), evt(3)], // 1 고침, 2 지움, 3 새로 → 3개
      timeBlocks: { '2026-01-05': [block('a', '회의', { todos: [{ id: 't', text: '자료', done: false }] })] }, // a 고침, b 지움 → 2개
    };
    expect(countChanges(saved, working)).toBe(5);
  });

  it('한 일정을 여러 번 고쳐도 1개다', () => {
    const saved = { events: [evt(1)], timeBlocks: {} };
    const working = { events: [evt(1, '새 이름', { color: '#FD8AEB', end_date: '2026-01-07' })], timeBlocks: {} };
    expect(countChanges(saved, working)).toBe(1);
  });

  it('시간 카드를 다른 날로 옮기면 그 날에서 지우고 새 날에 생긴 것으로 2개다', () => {
    const saved = { events: [], timeBlocks: { '2026-01-05': [block('a')] } };
    const working = { events: [], timeBlocks: { '2026-01-05': [], '2026-01-06': [block('a')] } };
    expect(countChanges(saved, working)).toBe(2);
  });
});
