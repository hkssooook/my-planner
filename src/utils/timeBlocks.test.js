import { describe, it, expect } from 'vitest';
import {
  hourToTime, timeToHour, isHourBlock, slotToBlock,
  migrateDailyToBlocks, blocksToSlots, slotsToBlocks,
} from './timeBlocks';

const BLUE = '#3B82F6';
const block = (id, start, end, content = '내용', extra = {}) => ({ id, start, end, content, is_important: false, color: BLUE, ...extra });

describe('시각 바꾸기', () => {
  it('hourToTime: 숫자 시 → "HH:00"', () => {
    expect(hourToTime(0)).toBe('00:00');
    expect(hourToTime(9)).toBe('09:00');
    expect(hourToTime(24)).toBe('24:00');
  });
  it('timeToHour: "HH:MM" → 몇 시대', () => {
    expect(timeToHour('09:00')).toBe(9);
    expect(timeToHour('09:30')).toBe(9);
    expect(timeToHour('23:00')).toBe(23);
  });
});

describe('isHourBlock (24줄 창에 한 줄로 보여 줄 수 있는 카드인가)', () => {
  it('정각에 시작해 한 시간이면 맞다', () => {
    expect(isHourBlock(block('a', '09:00', '10:00'))).toBe(true);
    expect(isHourBlock(block('a', '23:00', '24:00'))).toBe(true);
  });
  it('30분에 시작하거나 길이가 한 시간이 아니면 아니다', () => {
    expect(isHourBlock(block('a', '09:30', '10:30'))).toBe(false);
    expect(isHourBlock(block('a', '09:00', '11:00'))).toBe(false);
  });
});

describe('slotToBlock (옛 칸 → 카드)', () => {
  it('hour를 start/end로 바꾸고 나머지는 그대로 둔다', () => {
    const slot = { hour: 23, content: '마감', is_important: true, color: BLUE };
    expect(slotToBlock(slot, 'x')).toEqual({ id: 'x', start: '23:00', end: '24:00', content: '마감', is_important: true, color: BLUE });
  });
  it('id를 주지 않으면 새로 만든다', () => {
    const a = slotToBlock({ hour: 1, content: 'a' });
    const b = slotToBlock({ hour: 1, content: 'a' });
    expect(typeof a.id).toBe('string');
    expect(a.id).not.toBe(b.id);
  });
});

describe('migrateDailyToBlocks (옛 저장 데이터 전체 변환)', () => {
  it('날짜별로 카드로 바꾸고 시간순으로 정렬한다', () => {
    const result = migrateDailyToBlocks({
      '2026-01-05': [{ hour: 14, content: '오후' }, { hour: 9, content: '아침' }],
      '2026-01-06': [],
    });
    expect(result['2026-01-05'].map((b) => [b.start, b.end, b.content])).toEqual([
      ['09:00', '10:00', '아침'],
      ['14:00', '15:00', '오후'],
    ]);
    expect(result['2026-01-06']).toEqual([]);
  });
  it('모양이 이상한 날짜나 칸은 건너뛴다', () => {
    const result = migrateDailyToBlocks({
      '2026-01-05': [null, { content: '시간 없음' }, { hour: 25, content: '없는 시간' }, { hour: 8, content: '정상' }],
      '2026-01-06': 'broken',
    });
    expect(result['2026-01-05'].map((b) => b.content)).toEqual(['정상']);
    expect(result).not.toHaveProperty('2026-01-06');
  });
});

describe('blocksToSlots (카드 → 상세 일정 창 24줄)', () => {
  it('24줄을 만들고 카드가 있는 시간만 채운다 (id도 함께)', () => {
    const slots = blocksToSlots([block('a', '09:00', '10:00', '회의', { is_important: true })], BLUE);
    expect(slots).toHaveLength(24);
    expect(slots[9]).toEqual({ hour: 9, id: 'a', content: '회의', is_important: true, color: BLUE });
    expect(slots[10]).toEqual({ hour: 10, content: '', is_important: false, color: BLUE });
  });
  it('색이 없는 카드는 기본 색으로 채운다', () => {
    const slots = blocksToSlots([{ id: 'a', start: '09:00', end: '10:00', content: '회의' }], BLUE);
    expect(slots[9].color).toBe(BLUE);
  });
  it('24줄로 보여 줄 수 없는 카드(9:30 시작)는 줄에 넣지 않는다', () => {
    const slots = blocksToSlots([block('a', '09:30', '10:30')], BLUE);
    expect(slots.every((s) => s.content === '')).toBe(true);
  });
});

describe('slotsToBlocks (상세 일정 창 24줄 → 카드)', () => {
  it('내용이 빈 줄은 빼고, 원래 카드의 id와 다른 속성을 이어받는다', () => {
    const existing = [block('a', '09:00', '10:00', '회의', { todos: ['나중에 붙을 속성'] })];
    const slots = blocksToSlots(existing, BLUE);
    slots[9].content = '회의 (수정)';
    slots[14].content = '새 일정';

    const result = slotsToBlocks(slots, existing);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ ...existing[0], content: '회의 (수정)' });
    expect(result[1]).toMatchObject({ start: '14:00', end: '15:00', content: '새 일정' });
    expect(result[1].id).not.toBe('a');
  });
  it('줄에 id가 미리 붙어 있으면 새 카드가 그 id를 쓴다 (여러 번 저장해도 같은 카드)', () => {
    const slots = blocksToSlots([], BLUE);
    slots[9] = { ...slots[9], id: 'pre', content: '회' };
    const first = slotsToBlocks(slots, []);
    slots[9] = { ...slots[9], content: '회의' };
    const second = slotsToBlocks(slots, first);
    expect(first[0].id).toBe('pre');
    expect(second).toEqual([{ ...first[0], content: '회의' }]);
  });
  it('줄의 내용을 지우면 그 카드는 사라진다', () => {
    const existing = [block('a', '09:00', '10:00', '회의')];
    const slots = blocksToSlots(existing, BLUE);
    slots[9].content = '   ';
    expect(slotsToBlocks(slots, existing)).toEqual([]);
  });
  it('24줄로 보여 줄 수 없던 카드는 손대지 않고 남겨 두고, 시간순으로 섞는다', () => {
    const odd = block('o', '09:30', '11:00', '긴 회의');
    const slots = blocksToSlots([odd], BLUE);
    slots[8].content = '아침';
    slots[13].content = '점심 뒤';
    expect(slotsToBlocks(slots, [odd]).map((b) => b.content)).toEqual(['아침', '긴 회의', '점심 뒤']);
  });
});
