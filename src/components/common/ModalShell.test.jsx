import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalShell from './ModalShell';

// 배경(바깥 겹)과 흰 상자(안쪽 겹)를 꺼내는 도우미
const renderShell = (props = {}) => {
  const { container } = render(<ModalShell {...props}>팝업 내용</ModalShell>);
  const overlay = container.firstChild;
  const panel = overlay.firstChild;
  return { overlay, panel };
};

// 겹침 순서 이름 -> z-index 숫자 (예: 'z-70' -> 70)
const zOf = (layer) => {
  const { overlay } = renderShell({ layer });
  return Number([...overlay.classList].find((c) => c.startsWith('z-')).match(/\d+/)[0]);
};

describe('ModalShell (팝업의 배경 + 흰 상자)', () => {
  it('안쪽 내용을 그대로 보여 준다', () => {
    renderShell();
    expect(screen.getByText('팝업 내용')).toBeInTheDocument();
  });

  it('아무 옵션이 없으면 기본 모양이다 (배경 50%, 가장 낮은 층, 중간 너비, 크게 둥근 모서리)', () => {
    const { overlay, panel } = renderShell();
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black/50', 'z-50', 'flex', 'items-center', 'justify-center', 'p-4');
    expect(panel).toHaveClass('bg-white', 'rounded-xl', 'shadow-xl', 'w-full', 'max-w-sm');
  });

  it('배경 어둡기와 상자 모서리는 어떤 옵션을 줘도 모든 팝업이 같다', () => {
    for (const props of [{}, { layer: 'confirm', width: 'xs' }, { layer: 'more', width: 'lg', maxHeight: '90vh' }]) {
      const { overlay, panel } = renderShell(props);
      expect(overlay).toHaveClass('bg-black/50');
      expect(panel).toHaveClass('rounded-xl');
    }
  });

  it.each([
    ['xs', 'max-w-xs'],
    ['sm', 'max-w-sm'],
    ['lg', 'max-w-lg'],
  ])('상자 너비 %s → %s', (width, expected) => {
    expect(renderShell({ width }).panel).toHaveClass(expected);
  });

  it('겹침 순서 이름마다 올바른 층이 정해진다', () => {
    expect(renderShell({ layer: 'base' }).overlay).toHaveClass('z-50');
    expect(renderShell({ layer: 'more' }).overlay).toHaveClass('z-60');
    expect(renderShell({ layer: 'edit' }).overlay).toHaveClass('z-70');
    expect(renderShell({ layer: 'confirm' }).overlay).toHaveClass('z-80');
  });

  it('겹침 순서는 base < more < edit < confirm 이어야 한다 (삭제 확인이 수정 팝업 위에, 수정이 더보기 위에 떠야 하므로)', () => {
    expect(zOf('base')).toBeLessThan(zOf('more'));
    expect(zOf('more')).toBeLessThan(zOf('edit'));
    expect(zOf('edit')).toBeLessThan(zOf('confirm'));
  });

  it('흰 상자는 안쪽 여백(p-6)을 갖고 안쪽 내용을 위에서 아래로 gap-4 간격으로 쌓는다', () => {
    const { panel } = renderShell();
    expect(panel).toHaveClass('p-6', 'flex', 'flex-col', 'gap-4');
  });

  it('최대 높이를 정하지 않으면 높이 제한이 없다', () => {
    const { panel } = renderShell();
    expect([...panel.classList].some((c) => c.startsWith('max-h-'))).toBe(false);
  });

  it.each([
    ['80vh', 'max-h-[80vh]'],
    ['90vh', 'max-h-[90vh]'],
  ])('maxHeight %s → %s (기본 모양은 유지)', (maxHeight, expected) => {
    const { panel } = renderShell({ maxHeight });
    expect(panel).toHaveClass(expected, 'bg-white', 'rounded-xl', 'p-6');
  });
});

describe('ModalShell: 팝업 위에서 마우스를 놓는 동작', () => {
  // 달력은 "마우스를 놓는 순간"을 화면 전체(window)에서 감지해서 날짜 끌기를 끝낸다.
  // 팝업 위에서 놓은 것이 거기까지 전달되면 안 되므로 기본적으로 막는다.
  it.each([
    ['기본', {}],
    ['삭제 확인 층', { layer: 'confirm', width: 'xs' }],
  ])('항상 막아서(%s), 화면 전체(window)의 마우스 놓기 감지에 전달되지 않는다', (_이름, props) => {
    const onWindowMouseUp = vi.fn();
    window.addEventListener('mouseup', onWindowMouseUp);
    renderShell(props);
    fireEvent.mouseUp(screen.getByText('팝업 내용'));
    window.removeEventListener('mouseup', onWindowMouseUp);

    expect(onWindowMouseUp).not.toHaveBeenCalled();
  });
});
