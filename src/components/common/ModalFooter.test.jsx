import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ModalFooter from './ModalFooter';

const renderFooter = (props = {}) => {
  const { container } = render(
    <ModalFooter {...props}>
      <button>취소</button>
      <button>저장</button>
    </ModalFooter>,
  );
  return container.firstChild;
};

describe('ModalFooter (팝업 버튼줄)', () => {
  it('자식 버튼을 모두 보여 준다', () => {
    renderFooter();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('기본은 오른쪽 정렬이고 버튼 사이에 간격이 있다 (shadcn DialogFooter 기본)', () => {
    expect(renderFooter()).toHaveClass('flex', 'gap-2', 'justify-end');
  });

  it('기본에서는 양쪽 갈라 놓기(justify-between)를 쓰지 않는다', () => {
    expect(renderFooter()).not.toHaveClass('justify-between');
  });

  it('spread이면 양쪽으로 갈라 놓고, 오른쪽 정렬은 쓰지 않는다', () => {
    const footer = renderFooter({ spread: true });
    expect(footer).toHaveClass('flex', 'gap-2', 'justify-between');
    expect(footer).not.toHaveClass('justify-end');
  });

  it('버튼들이 폭을 반씩 나눠 갖지 않는다 (자식에 flex-1을 주지 않으면 글자 크기만큼만 차지)', () => {
    renderFooter();
    expect(screen.getByRole('button', { name: '저장' })).not.toHaveClass('flex-1');
  });
});
