import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePlannerData from './usePlannerData';
import usePanels from './usePanels';

// 앱과 같이 usePlannerData 위에 usePanels를 얹어서 시험한다
const setup = () => renderHook(() => {
  const data = usePlannerData();
  return { data, panels: usePanels(data) };
});

const DAY = '2026-06-20';
const card = (id, content = '') => ({ id, start: '09:00', end: '10:00', content, color: '#8DA5FD', is_important: false });
const event = () => ({ title: '여행', start_date: DAY, end_date: DAY, color: '#8DA5FD' });
// commitAddEvent가 붙인 고유번호
const eventId = (result) => result.current.data.events[0].id;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('usePanels (패널 열고 닫기 규칙)', () => {
  it('처음에는 모두 닫혀 있다', () => {
    const { result } = setup();
    expect(result.current.panels.panel).toBeNull();
    expect(result.current.panels.newDraft).toBeNull();
  });

  it('날짜를 열 때마다 openCount가 늘어 패널을 새로 그린다', () => {
    const { result } = setup();
    act(() => result.current.panels.openDayPanel(null, DAY));
    act(() => result.current.panels.openDayPanel(null, DAY));
    expect(result.current.panels.panel).toEqual({ date: DAY, openCount: 2 });
  });

  it('두 번째 패널은 하나만: 기간 일정을 고르면 카드 상세가 닫힌다', () => {
    const { result } = setup();
    act(() => result.current.data.commitAddTimeBlock(DAY, card('a', '회의')));
    act(() => result.current.data.commitAddEvent(event()));
    act(() => result.current.panels.openDayPanel(null, DAY, 'a'));
    expect(result.current.panels.selectedBlock?.id).toBe('a');

    act(() => result.current.panels.selectEvent(eventId(result)));
    expect(result.current.panels.selectedBlockId).toBeNull();
    expect(result.current.panels.openEvent?.id).toBe(eventId(result));
  });

  it('새 일정 패널을 열면 상세 패널이 닫히고, 다른 날이면 그 날 패널도 연다', () => {
    const { result } = setup();
    act(() => result.current.data.commitAddEvent(event()));
    act(() => result.current.panels.openDayPanel(null, DAY, null, eventId(result)));
    act(() => result.current.panels.openNewEvent('2026-06-21', 'timed'));
    expect(result.current.panels.openEventId).toBeNull();
    expect(result.current.panels.panel.date).toBe('2026-06-21');
    expect(result.current.panels.newDraft).toMatchObject({ kind: 'timed', date: '2026-06-21', startSlot: 18, endSlot: 20 });
  });

  it('빈 카드를 고른 채 다른 날로 넘기면 그 빈 카드를 치운다', () => {
    const { result } = setup();
    act(() => result.current.panels.openDayPanel(null, DAY));
    act(() => result.current.data.addTimeBlock(DAY, card('empty')));
    act(() => result.current.panels.selectBlock('empty'));
    act(() => result.current.panels.moveDayPanel(1));
    expect(result.current.data.timeBlocks[DAY] ?? []).toEqual([]);
    expect(result.current.panels.panel.date).toBe('2026-06-21');
  });

  it('저장 안 한 변경이 있으면 X를 눌렀을 때 바로 닫지 않고 묻는다', () => {
    const { result } = setup();
    act(() => result.current.panels.openDayPanel(null, DAY));
    act(() => result.current.data.addTimeBlock(DAY, card('a', '회의')));
    act(() => result.current.panels.closeDayPanel());
    expect(result.current.panels.closeConfirm.open).toBe(true);
    expect(result.current.panels.panel).not.toBeNull();

    act(() => result.current.panels.closeConfirm.discardAndClose());
    expect(result.current.panels.panel).toBeNull();
    expect(result.current.data.changeCount).toBe(0);
  });

  it('기간 일정 삭제는 확인을 받은 뒤 지우고, 열려 있던 상세 패널도 닫는다', () => {
    const { result } = setup();
    act(() => result.current.data.commitAddEvent(event()));
    act(() => result.current.panels.openDayPanel(null, DAY, null, eventId(result)));
    act(() => result.current.panels.deleteConfirm.ask(result.current.panels.openEvent));
    expect(result.current.panels.deleteConfirm.open).toBe(true);
    expect(result.current.data.savedEvents).toHaveLength(1);

    act(() => result.current.panels.deleteConfirm.confirm());
    expect(result.current.data.savedEvents).toHaveLength(0);
    expect(result.current.panels.openEventId).toBeNull();
    expect(result.current.panels.deleteConfirm.open).toBe(false);
  });
});
