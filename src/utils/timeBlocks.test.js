import { describe, it, expect } from 'vitest';
import {
  hourToTime, timeToHour, slotToBlock, migrateDailyToBlocks,
  slotToTime, timeToSlot, blockSlotRange, isSlotTaken, isRangeFree, freeRangeFrom, makeTimeBlock, sortBlocks,
} from './timeBlocks';

const BLUE = '#3B82F6';

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

describe('30분 칸 바꾸기', () => {
  it('slotToTime: 칸 번호 → "HH:MM" (48은 하루의 끝 24:00)', () => {
    expect(slotToTime(0)).toBe('00:00');
    expect(slotToTime(19)).toBe('09:30');
    expect(slotToTime(47)).toBe('23:30');
    expect(slotToTime(48)).toBe('24:00');
  });

  it('timeToSlot: "HH:MM" → 칸 번호 (30분에 안 맞으면 그 칸으로 내림)', () => {
    expect(timeToSlot('00:00')).toBe(0);
    expect(timeToSlot('09:30')).toBe(19);
    expect(timeToSlot('09:45')).toBe(19);
    expect(timeToSlot('24:00')).toBe(48);
  });

  it('blockSlotRange: 카드가 차지하는 [시작 칸, 끝 칸)', () => {
    expect(blockSlotRange({ start: '09:00', end: '10:30' })).toEqual([18, 21]);
    expect(blockSlotRange({ start: '09:00', end: '09:40' })).toEqual([18, 20]); // 끝이 칸 중간이면 그 칸까지
    expect(blockSlotRange({ start: '09:00', end: '09:00' })).toEqual([18, 19]); // 최소 한 칸
  });
});

describe('겹침 검사', () => {
  const blocks = [{ start: '09:00', end: '10:00' }, { start: '12:00', end: '12:30' }];

  it('isSlotTaken: 카드가 있는 칸만 찼다고 본다 (끝 칸은 비어 있음)', () => {
    expect(isSlotTaken(blocks, 18)).toBe(true);
    expect(isSlotTaken(blocks, 19)).toBe(true);
    expect(isSlotTaken(blocks, 20)).toBe(false); // 10:00 칸
    expect(isSlotTaken(blocks, 24)).toBe(true); // 12:00 칸
  });

  it('isRangeFree: 범위 안에 찬 칸이 하나라도 있으면 false', () => {
    expect(isRangeFree(blocks, 20, 24)).toBe(true); // 10:00~12:00
    expect(isRangeFree(blocks, 20, 25)).toBe(false); // 12:00 칸과 겹침
    expect(isRangeFree(blocks, 16, 19)).toBe(false);
  });
});

describe('freeRangeFrom (드래그 범위)', () => {
  const blocks = [{ start: '09:00', end: '10:00' }]; // 18, 19 칸

  it('아래로 끌면 [누른 칸, 지금 칸+1)', () => {
    expect(freeRangeFrom(blocks, 20, 23)).toEqual([20, 24]);
  });

  it('위로 끌어도 된다', () => {
    expect(freeRangeFrom(blocks, 25, 22)).toEqual([22, 26]);
  });

  it('기존 카드를 만나면 그 바로 앞에서 멈춘다 (위·아래 모두)', () => {
    expect(freeRangeFrom(blocks, 14, 30)).toEqual([14, 18]);
    expect(freeRangeFrom(blocks, 24, 10)).toEqual([20, 25]);
  });

  it('제자리 클릭이면 30분 한 칸, 하루 범위 밖으로는 늘어나지 않는다', () => {
    expect(freeRangeFrom(blocks, 30, 30)).toEqual([30, 31]);
    expect(freeRangeFrom([], 46, 60)).toEqual([46, 48]);
    expect(freeRangeFrom([], 1, -5)).toEqual([0, 2]);
  });
});

describe('makeTimeBlock / sortBlocks', () => {
  it('칸 범위로 이름 없는 새 카드를 만든다', () => {
    const block = makeTimeBlock(18, 21, '#123456');
    expect(block).toEqual({ id: expect.any(String), start: '09:00', end: '10:30', content: '', color: '#123456', is_important: false });
  });

  it('시작 시각 순서로 정렬한 새 목록을 돌려준다 (원래 목록은 그대로)', () => {
    const list = [{ start: '14:00' }, { start: '09:30' }];
    expect(sortBlocks(list).map((b) => b.start)).toEqual(['09:30', '14:00']);
    expect(list[0].start).toBe('14:00');
  });
});
