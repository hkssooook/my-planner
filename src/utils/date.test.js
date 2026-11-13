import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDaysInMonth, getDayOfWeek, getCurrentYear, getYearOptions } from './date';

describe('getDaysInMonth (한 달의 일수)', () => {
  it('31일인 달과 30일인 달을 구분한다', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31);
    expect(getDaysInMonth(2026, 4)).toBe(30);
    expect(getDaysInMonth(2026, 12)).toBe(31);
  });

  it('2월은 평년 28일, 윤년 29일이다', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28);
    expect(getDaysInMonth(2027, 2)).toBe(28);
    expect(getDaysInMonth(2028, 2)).toBe(29);
  });

  it('100으로 나누어떨어지는 해는 윤년이 아니지만 400으로도 나누어떨어지면 윤년이다', () => {
    expect(getDaysInMonth(2100, 2)).toBe(28);
    expect(getDaysInMonth(2000, 2)).toBe(29);
  });
});

describe('getDayOfWeek (요일, 일요일=0 ~ 토요일=6)', () => {
  it('알려진 날짜의 요일이 맞다', () => {
    expect(getDayOfWeek(2000, 1, 1)).toBe(6); // 2000-01-01 토요일
    expect(getDayOfWeek(2026, 1, 1)).toBe(4); // 2026-01-01 목요일
    expect(getDayOfWeek(2026, 1, 4)).toBe(0); // 2026-01-04 일요일
    expect(getDayOfWeek(2027, 12, 25)).toBe(6); // 2027-12-25 토요일
  });

  it('윤일(2월 29일)도 계산한다', () => {
    expect(getDayOfWeek(2028, 2, 29)).toBe(2); // 2028-02-29 화요일
  });
});

describe('getCurrentYear (올해)', () => {
  afterEach(() => {
    vi.useRealTimers(); // 시계를 원래대로 돌려놓는다
  });

  it('고정한 날짜의 해를 돌려준다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2029, 2, 1, 12, 0, 0));
    expect(getCurrentYear()).toBe(2029);
  });

  it('해가 바뀌는 순간을 정확히 구분한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    expect(getCurrentYear()).toBe(2026);
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 0));
    expect(getCurrentYear()).toBe(2027);
  });
});

describe('getYearOptions (연도 선택 목록)', () => {
  it('기준 연도 앞뒤로 목록을 만든다', () => {
    expect(getYearOptions(2026, { before: 1, after: 3 })).toEqual([2025, 2026, 2027, 2028, 2029]);
  });

  it('범위를 바꾸면 목록도 바뀐다', () => {
    expect(getYearOptions(2026, { before: 0, after: 0 })).toEqual([2026]);
    expect(getYearOptions(2030, { before: 2, after: 1 })).toEqual([2028, 2029, 2030, 2031]);
  });
});
