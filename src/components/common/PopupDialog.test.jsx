import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PopupDialog from './PopupDialog';
import { DialogTitle } from '@/components/ui/dialog';

const renderPopup = (props = {}) =>
  render(
    <PopupDialog {...props}>
      <DialogTitle>제목</DialogTitle>
      팝업 내용
    </PopupDialog>,
  );
const box = () => screen.getByRole('dialog', { name: '제목' });

describe('PopupDialog (모든 팝업의 shadcn Dialog 한 겹)', () => {
  it('렌더하면 열려 있고 안쪽 내용이 보인다', () => {
    renderPopup();
    expect(box()).toHaveTextContent('팝업 내용');
  });

  it('아무 옵션이 없으면 기본 모양이다 (중간 너비, 높이 제한 없음)', () => {
    renderPopup();
    expect(box()).toHaveClass('sm:max-w-sm', 'rounded-xl', 'p-4');
    expect([...box().classList].some((c) => c.startsWith('max-h-'))).toBe(false);
  });

  it.each([
    ['xs', 'sm:max-w-xs'],
    ['sm', 'sm:max-w-sm'],
    ['lg', 'sm:max-w-lg'],
  ])('너비 %s → %s', (width, expected) => {
    renderPopup({ width });
    expect(box()).toHaveClass(expected);
  });

  it.each([
    ['80vh', 'max-h-[80vh]'],
    ['90vh', 'max-h-[90vh]'],
  ])('최대 높이 %s → %s (세로로 쌓아서 안쪽 스크롤 영역이 남은 높이를 쓴다)', (maxHeight, expected) => {
    renderPopup({ maxHeight });
    expect(box()).toHaveClass(expected, 'flex', 'flex-col');
  });
});

describe('PopupDialog: 닫는 방법', () => {
  it('onClose를 안 주면 닫기(X) 버튼이 없다', () => {
    renderPopup();
    expect(screen.queryByRole('button', { name: '닫기' })).toBeNull();
  });

  it('onClose를 주면 한국어 "닫기" 버튼이 생기고, 누르면 onClose가 한 번 호출된다', async () => {
    const onClose = vi.fn();
    renderPopup({ onClose });
    await userEvent.setup().click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc 키로는 닫히지 않는다 (이 앱의 원래 동작)', async () => {
    const onClose = vi.fn();
    renderPopup({ onClose });
    await userEvent.setup().keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(box()).toBeInTheDocument();
  });

  it('바깥(어두운 배경)을 눌러도 닫히지 않는다 (이 앱의 원래 동작)', async () => {
    const onClose = vi.fn();
    renderPopup({ onClose });
    await userEvent.setup().click(document.querySelector('[data-slot="dialog-overlay"]'));
    expect(onClose).not.toHaveBeenCalled();
    expect(box()).toBeInTheDocument();
  });
});

describe('PopupDialog: 팝업 위에서 마우스를 놓는 동작', () => {
  // 달력은 "마우스를 놓는 순간"을 화면 전체(window)에서 감지해서 날짜 끌기를 끝낸다.
  // 팝업 위에서 놓은 것이 거기까지 전달되면 안 되므로 항상 막는다.
  it.each([
    ['팝업 안쪽', () => screen.getByText('팝업 내용', { exact: false })],
    ['어두운 배경', () => document.querySelector('[data-slot="dialog-overlay"]')],
  ])('%s에서 놓아도 화면 전체(window)의 마우스 놓기 감지에 전달되지 않는다', (_이름, target) => {
    const onWindowMouseUp = vi.fn();
    window.addEventListener('mouseup', onWindowMouseUp);
    renderPopup();
    fireEvent.mouseUp(target());
    window.removeEventListener('mouseup', onWindowMouseUp);
    expect(onWindowMouseUp).not.toHaveBeenCalled();
  });
});
