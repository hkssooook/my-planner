import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDragSelect from './useDragSelect';

// 마우스를 "놓는" 동작은 칸이 아니라 화면 전체(window)에서 감지한다.
const releaseMouse = () => act(() => window.dispatchEvent(new MouseEvent('mouseup')));

const setup = (onSelect = vi.fn()) => {
  const hook = renderHook((props) => useDragSelect(props), { initialProps: { onSelect } });
  return { ...hook, onSelect };
};

const press = (result, date) => act(() => result.current.handleMouseDown(date));
const moveTo = (result, date) => act(() => result.current.handleMouseEnter(date));

describe('useDragSelect (날짜를 끌어서 범위 고르기)', () => {
  it('처음에는 아무것도 선택돼 있지 않다', () => {
    const { result } = setup();
    expect(result.current.selectionStart).toBeNull();
    expect(result.current.selectionEnd).toBeNull();
  });

  it('칸을 누르면 그 칸이 시작이자 끝으로 선택된다', () => {
    const { result } = setup();
    press(result, '2026-01-05');
    expect(result.current.selectionStart).toBe('2026-01-05');
    expect(result.current.selectionEnd).toBe('2026-01-05');
  });

  it('누르지 않은 채 칸 위를 지나가기만 해서는 선택되지 않는다', () => {
    const { result } = setup();
    moveTo(result, '2026-01-07');
    expect(result.current.selectionStart).toBeNull();
    expect(result.current.selectionEnd).toBeNull();
  });

  it('누른 채로 다른 칸으로 끌면 끝 날짜가 따라온다', () => {
    const { result } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-06');
    moveTo(result, '2026-01-08');
    expect(result.current.selectionStart).toBe('2026-01-05');
    expect(result.current.selectionEnd).toBe('2026-01-08');
  });

  it('두 칸 이상 고르고 놓으면 onSelect가 (시작, 끝)으로 한 번 호출된다', () => {
    const { result, onSelect } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    releaseMouse();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('2026-01-05', '2026-01-07');
  });

  it('놓은 뒤에도 선택 표시는 남아 있다 (팝업이 열려 있는 동안 보여 주기 위해)', () => {
    const { result } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    releaseMouse();
    expect(result.current.selectionStart).toBe('2026-01-05');
    expect(result.current.selectionEnd).toBe('2026-01-07');
  });

  it('거꾸로(오른쪽에서 왼쪽으로) 끌어도 작은 날짜가 먼저 오도록 정렬해서 알려 준다', () => {
    const { result, onSelect } = setup();
    press(result, '2026-01-07');
    moveTo(result, '2026-01-05');
    releaseMouse();
    expect(onSelect).toHaveBeenCalledWith('2026-01-05', '2026-01-07');
  });

  it('달이나 해를 넘어가는 범위도 날짜 순서로 정렬한다', () => {
    const { result, onSelect } = setup();
    press(result, '2027-01-02');
    moveTo(result, '2026-12-30');
    releaseMouse();
    expect(onSelect).toHaveBeenCalledWith('2026-12-30', '2027-01-02');
  });

  it('한 칸만 누르고 놓으면 onSelect는 호출되지 않고 선택은 지워진다', () => {
    const { result, onSelect } = setup();
    press(result, '2026-01-05');
    releaseMouse();

    expect(onSelect).not.toHaveBeenCalled();
    expect(result.current.selectionStart).toBeNull();
    expect(result.current.selectionEnd).toBeNull();
  });

  it('끌었다가 같은 칸으로 되돌아와서 놓아도 한 칸 클릭과 같게 취급한다', () => {
    const { result, onSelect } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    moveTo(result, '2026-01-05');
    releaseMouse();
    expect(onSelect).not.toHaveBeenCalled();
    expect(result.current.selectionStart).toBeNull();
  });

  it('누르지 않은 상태에서 마우스를 놓는 동작은 아무 일도 하지 않는다', () => {
    const { result, onSelect } = setup();
    releaseMouse();
    expect(onSelect).not.toHaveBeenCalled();
    expect(result.current.selectionStart).toBeNull();
  });

  it('놓은 뒤에는 칸 위를 지나가도 더 이상 끌려가지 않는다', () => {
    const { result } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    releaseMouse();
    moveTo(result, '2026-01-20');
    expect(result.current.selectionEnd).toBe('2026-01-07');
  });

  it('끄는 도중 clearSelection을 부르면 선택이 지워지고, 이후 마우스를 놓아도 onSelect가 호출되지 않는다', () => {
    const { result, onSelect } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    act(() => result.current.clearSelection());
    expect(result.current.selectionStart).toBeNull();
    expect(result.current.selectionEnd).toBeNull();

    releaseMouse();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('범위를 고른 뒤 clearSelection을 부르면 선택 표시가 지워진다 (팝업을 닫을 때)', () => {
    const { result } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    releaseMouse();
    act(() => result.current.clearSelection());
    expect(result.current.selectionStart).toBeNull();
    expect(result.current.selectionEnd).toBeNull();
  });

  it('onSelect가 새 함수로 바뀌면 그 뒤로는 새 함수가 호출된다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = setup(first);
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    rerender({ onSelect: second });
    releaseMouse();

    expect(second).toHaveBeenCalledWith('2026-01-05', '2026-01-07');
    expect(first).not.toHaveBeenCalled();
  });

  it('화면에서 사라진(unmount) 뒤에는 마우스를 놓아도 아무것도 호출하지 않는다', () => {
    const { result, unmount, onSelect } = setup();
    press(result, '2026-01-05');
    moveTo(result, '2026-01-07');
    unmount();
    window.dispatchEvent(new MouseEvent('mouseup'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
