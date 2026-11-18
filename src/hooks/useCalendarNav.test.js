import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCalendarNav from './useCalendarNav';

// 오늘을 2026-11-18(수)로 고정한다. 이번 주 일요일은 11-15
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 18, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useCalendarNav (달력에서 보는 곳)', () => {
  it('처음에는 올해·이번 달·이번 주, 연 보기(파랑)', () => {
    const { result } = renderHook(() => useCalendarNav());
    expect(result.current).toMatchObject({
      view: 'year', theme: 'blue', thisYear: 2026, currentYear: 2026, currentMonth: 11, weekStart: '2026-11-15',
    });
  });

  it('보기를 바꾸면 색도 바뀐다', () => {
    const { result } = renderHook(() => useCalendarNav());
    act(() => result.current.changeView('month'));
    expect(result.current).toMatchObject({ view: 'month', isMonthView: true, theme: 'amber' });
    act(() => result.current.changeView('week'));
    expect(result.current).toMatchObject({ view: 'week', isWeekView: true, theme: 'mint' });
  });

  it('올해가 아닌 해에서 주 보기로 가면 그 해의 첫 주', () => {
    const { result } = renderHook(() => useCalendarNav());
    act(() => result.current.changeYear(2027));
    act(() => result.current.changeView('week'));
    expect(result.current.weekStart).toBe('2026-12-27'); // 2027-01-01(금)이 든 주의 일요일
  });

  it('주 보기에서 연도를 고르면 그 해의 첫 주로 간다', () => {
    const { result } = renderHook(() => useCalendarNav());
    act(() => result.current.changeView('week'));
    act(() => result.current.changeYear(2028));
    expect(result.current).toMatchObject({ currentYear: 2028, weekStart: '2027-12-26' });
  });

  it('주를 옮기면 보는 해는 그 주의 수요일이 속한 해', () => {
    const { result } = renderHook(() => useCalendarNav());
    act(() => result.current.changeWeek('2026-12-27')); // 수요일 = 12-30
    expect(result.current.currentYear).toBe(2026);
    act(() => result.current.changeWeek('2027-01-03'));
    expect(result.current.currentYear).toBe(2027);
  });

  it('달을 옮기면 해와 달을 함께 바꾼다', () => {
    const { result } = renderHook(() => useCalendarNav());
    act(() => result.current.changeMonth(2027, 1));
    expect(result.current).toMatchObject({ currentYear: 2027, currentMonth: 1 });
  });

  it('"오늘"로 돌아가면 올해·이번 달·이번 주, 보기는 그대로', () => {
    const { result } = renderHook(() => useCalendarNav());
    act(() => result.current.changeView('month'));
    act(() => result.current.changeMonth(2028, 3));
    act(() => result.current.jumpToToday('2026-11-18'));
    expect(result.current).toMatchObject({
      view: 'month', currentYear: 2026, currentMonth: 11, weekStart: '2026-11-15',
    });
  });
});
