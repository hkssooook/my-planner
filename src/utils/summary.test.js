import { describe, it, expect } from 'vitest';
import { summarize } from './summary';

const todo = (done) => ({ id: Math.random().toString(), text: '할 일', done });
const evt = (title, start, end = start, todos) => ({ id: title, title, start_date: start, end_date: end, color: '#8DA5FD', ...(todos ? { todos } : {}) });
const block = (content, start, extra = {}) => ({ id: content, start, end: '23:30', content, color: '#8DA5FD', is_important: false, ...extra });
const YEAR = { from: '2026-01-01', to: '2026-12-31', today: '2026-06-15' };

describe('summarize (요약 줄 숫자)', () => {
  it('할 일: 범위에 걸친 기간 일정과 범위 안 날짜의 시간 카드의 할 일을 센다 (범위 밖은 빼고, 기간 일정은 한 번만)', () => {
    const r = summarize({
      ...YEAR,
      events: [evt('해넘이', '2025-12-30', '2026-01-02', [todo(true), todo(false)]), evt('작년', '2025-05-01', '2025-05-01', [todo(false)])],
      timeBlocks: { '2026-03-01': [block('공부', '09:00', { todos: [todo(true)] })], '2027-01-01': [block('내년', '09:00', { todos: [todo(false)] })] },
    });
    expect(r.todos).toEqual({ done: 2, total: 3 });
  });

  it('다가오는 일정: 오늘부터 7일 안에 끝나는 기간·종일 일정과 ★ 시간 일정을 세고, 가장 가까운 것을 알려 준다', () => {
    const r = summarize({
      ...YEAR,
      events: [
        evt('어제 끝남', '2026-06-10', '2026-06-14'),
        evt('여행', '2026-06-12', '2026-06-18'), // 6/18에 끝남 → 셈
        evt('일주일 뒤', '2026-06-21'), // 6/21 = 오늘+6 → 셈
        evt('너무 멀다', '2026-06-22'),
      ],
      timeBlocks: {
        '2026-06-16': [block('중요 회의', '10:00', { is_important: true }), block('보통 회의', '09:00')],
      },
    });
    expect(r.upcoming).toEqual({ count: 3, next: { date: '2026-06-16', title: '중요 회의' } });
  });

  it('다가오는 일정이 없으면 0개, next는 null이다', () => {
    expect(summarize({ ...YEAR, events: [], timeBlocks: {} }).upcoming).toEqual({ count: 0, next: null });
  });

  it('못 끝낸 일: 오늘 이전 날의 남은 할 일만 센다. 기간 일정은 끝나는 날이 오늘 이전이어야 지난 일이다', () => {
    const r = summarize({
      ...YEAR,
      events: [
        evt('끝난 기간', '2026-06-01', '2026-06-03', [todo(false), todo(true)]), // 1
        evt('진행 중', '2026-06-10', '2026-06-20', [todo(false)]), // 아직 안 끝남 → 0
      ],
      timeBlocks: {
        '2026-06-14': [block('어제', '09:00', { todos: [todo(false), todo(false)] })], // 2
        '2026-06-15': [block('오늘', '09:00', { todos: [todo(false)] })], // 오늘 → 0
      },
    });
    expect(r.overdue).toBe(3);
  });
});
