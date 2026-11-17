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

  it('7일 이내 주요 일정: 오늘부터 7일 안에 끝나는 기간·종일 일정과 ★ 시간 일정을 세고, 가장 가까운 것을 알려 준다', () => {
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

  it('7일 이내 주요 일정이 없으면 0개, next는 null이다', () => {
    expect(summarize({ ...YEAR, events: [], timeBlocks: {} }).upcoming).toEqual({ count: 0, next: null });
  });

  it('7일 이내 주요 일정: 오늘의 ★ 시간 일정은 끝나는 시각이 지나면 빼고(진행 중은 센다), 오늘 끝나는 기간 일정은 오늘 하루 동안 센다', () => {
    const r = summarize({
      ...YEAR, now: '14:30',
      events: [evt('오늘 끝남', '2026-06-13', '2026-06-15')],
      timeBlocks: { '2026-06-15': [
        block('아침 회의', '09:00', { end: '10:00', is_important: true }), // 이미 끝남 → 뺌
        block('진행 중', '14:00', { end: '15:00', is_important: true }), // 진행 중 → 셈
        block('저녁', '19:00', { end: '20:00', is_important: true }), // 아직 → 셈
      ] },
    });
    expect(r.upcoming).toEqual({ count: 3, next: { date: '2026-06-15', title: '오늘 끝남' } });
  });

  it('7일 이내 주요 일정은 보는 범위 안으로 잘린다: 이번 달·이번 주 안의 날만, 지난 범위나 7일보다 먼 범위는 0개', () => {
    const events = [evt('6월 말', '2026-06-20'), evt('7월 초', '2026-07-01')];
    const base = { events, timeBlocks: {}, today: '2026-06-26' }; // 6/26 ~ 7/2
    expect(summarize({ ...base, from: '2026-06-01', to: '2026-06-30' }).upcoming.count).toBe(0); // 6/20은 지난 일
    expect(summarize({ ...base, from: '2026-07-01', to: '2026-07-31' }).upcoming.next).toEqual({ date: '2026-07-01', title: '7월 초' }); // 다음 달이지만 7일 안
    expect(summarize({ ...base, from: '2026-06-21', to: '2026-06-27' }).upcoming.count).toBe(0); // 이번 주 토요일(6/27)까지만
    expect(summarize({ ...base, from: '2026-05-01', to: '2026-05-31' }).upcoming.count).toBe(0); // 지난 달
    expect(summarize({ ...base, from: '2026-08-01', to: '2026-08-31' }).upcoming.count).toBe(0); // 7일보다 먼 달
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
