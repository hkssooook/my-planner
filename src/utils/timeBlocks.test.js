import { describe, it, expect } from 'vitest';
import {
  hourToTime, timeToHour, slotToBlock, migrateDailyToBlocks,
  slotToTime, timeToSlot, blockSlotRange, isSlotTaken, isRangeFree, freeRangeFrom, makeTimeBlock, sortBlocks,
  freeGapAround, freeStartsFor, movedRange, resizedRange, nextFreeHour,
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

describe('nextFreeHour (새 일정의 처음 시각)', () => {
  const otherDay = { isToday: false, nowHour: 15 };

  it('다른 날이면 09:00부터 찾는다', () => {
    expect(nextFreeHour([], otherDay)).toEqual([18, 20]); // 09:00~10:00
  });

  it('오늘이면 지금 다음 정각부터 찾는다', () => {
    expect(nextFreeHour([], { isToday: true, nowHour: 15 })).toEqual([32, 34]); // 16:00~17:00
  });

  it('밤 11시 이후의 오늘은 23:00~24:00', () => {
    expect(nextFreeHour([], { isToday: true, nowHour: 23 })).toEqual([46, 48]);
  });

  it('찬 시간은 건너뛰고 1시간이 비는 첫 자리를 준다', () => {
    const blocks = [{ start: '09:00', end: '10:30' }]; // 18~20 칸
    expect(nextFreeHour(blocks, otherDay)).toEqual([21, 23]); // 10:30~11:30
  });

  it('빈자리가 없으면 09:00~10:00', () => {
    const full = [{ start: '00:00', end: '24:00' }];
    expect(nextFreeHour(full, otherDay)).toEqual([18, 20]);
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

describe('카드 옮기기·늘이기', () => {
  const blocks = [
    { id: 'a', start: '08:00', end: '09:00' }, // 16~18
    { id: 'b', start: '10:00', end: '11:00' }, // 20~22
    { id: 'c', start: '13:00', end: '13:30' }, // 26~27
  ];

  it('freeGapAround: 바로 위 이웃의 끝 ~ 바로 아래 이웃의 시작 (이웃이 없으면 하루 끝까지)', () => {
    expect(freeGapAround(blocks, 'b')).toEqual([18, 26]);
    expect(freeGapAround(blocks, 'a')).toEqual([0, 20]);
    expect(freeGapAround(blocks, 'c')).toEqual([22, 48]);
  });

  it('movedRange: 길이는 그대로 옮기고, 겹치지 않으면 다른 카드를 넘어가도 된다', () => {
    expect(movedRange(blocks, 'b', [20, 22], 2)).toEqual([22, 24]);
    expect(movedRange(blocks, 'b', [20, 22], 10)).toEqual([30, 32]); // c(13:00)를 넘어 15:00으로
    expect(movedRange(blocks, 'a', [16, 18], 20)).toEqual([36, 38]); // a가 b·c를 모두 넘어 18:00으로
  });

  it('movedRange: 놓는 자리가 다른 카드와 겹치면 가장 가까운 빈자리로 보낸다 (같은 거리면 끄는 방향 쪽)', () => {
    expect(movedRange(blocks, 'a', [16, 18], 4)).toEqual([22, 24]); // b(20~22) 위에 놓으면 → 바로 아래 11:00
    expect(movedRange(blocks, 'a', [16, 18], 3)).toEqual([18, 20]); // 19~21은 b와 겹침 → 바로 위 09:00이 더 가깝다
    expect(movedRange(blocks, 'c', [26, 27], -6)).toEqual([19, 20]); // b(20~22) 위 → 위로 끄는 중이라 위쪽 빈자리
  });

  it('movedRange: 하루 밖으로는 나가지 않는다', () => {
    expect(movedRange(blocks, 'c', [26, 27], 100)).toEqual([47, 48]);
    expect(movedRange(blocks, 'a', [16, 18], -100)).toEqual([0, 2]);
  });

  it('freeStartsFor: 길이 그대로 놓을 수 있는 시작 칸 목록 (자기 자리 포함, 겹치는 자리 제외)', () => {
    const starts = freeStartsFor(blocks, 'b'); // 길이 2칸
    expect(starts).toContain(0);
    expect(starts).toContain(18); // 09:00~10:00 (a 바로 뒤)
    expect(starts).toContain(20); // 지금 자리
    expect(starts).toContain(24); // 12:00~13:00 (c 바로 앞)
    expect(starts).not.toContain(15); // a와 겹침
    expect(starts).not.toContain(25); // c와 겹침
    expect(starts.at(-1)).toBe(46); // 23:00~24:00
  });

  it('resizedRange: 위·아래 끝을 끌어 늘이거나 줄이고, 최소 한 칸이며 빈 구간을 넘지 않는다', () => {
    expect(resizedRange([20, 22], 'end', 23, [18, 26])).toEqual([20, 24]); // 11:30 칸까지 → 12:00 끝
    expect(resizedRange([20, 22], 'end', 40, [18, 26])).toEqual([20, 26]);
    expect(resizedRange([20, 22], 'end', 5, [18, 26])).toEqual([20, 21]); // 최소 30분
    expect(resizedRange([20, 22], 'start', 19, [18, 26])).toEqual([19, 22]);
    expect(resizedRange([20, 22], 'start', 0, [18, 26])).toEqual([18, 22]);
    expect(resizedRange([20, 22], 'start', 30, [18, 26])).toEqual([21, 22]);
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
