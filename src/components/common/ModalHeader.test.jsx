import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalHeader from './ModalHeader';

describe('ModalHeader (팝업 제목줄)', () => {
  it('제목을 제목(h2)으로 보여 준다', () => {
    render(<ModalHeader title="일정 수정" />);
    expect(screen.getByRole('heading', { level: 2, name: '일정 수정' })).toBeInTheDocument();
  });

  it('제목은 shadcn 기본 제목 모양이다 (text-lg, font-semibold)', () => {
    render(<ModalHeader title="일정 수정" />);
    expect(screen.getByRole('heading')).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
  });

  it('설명을 주면 제목 아래에 작은 회색 글씨로 보여 준다', () => {
    render(<ModalHeader title="기간 일정 등록" description="2026-01-05 ~ 2026-01-07" />);
    const description = screen.getByText('2026-01-05 ~ 2026-01-07');
    expect(description).toHaveClass('text-sm', 'text-gray-600');
  });

  it('설명을 안 주면 설명 칸이 없다', () => {
    const { container } = render(<ModalHeader title="일정 수정" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('onClose를 안 주면 닫기 버튼이 없다', () => {
    render(<ModalHeader title="일정 수정" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('onClose를 주면 닫기 버튼이 나타나고, 누르면 호출된다', async () => {
    const onClose = vi.fn();
    render(<ModalHeader title="상세 일정 관리" onClose={onClose} />);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('제목과 닫기 버튼이 양쪽 끝에 놓이도록 배치된다 (제목 쪽이 남는 폭을 차지)', () => {
    const { container } = render(<ModalHeader title="상세 일정 관리" onClose={() => {}} />);
    expect(container.firstChild).toHaveClass('flex', 'justify-between', 'items-start');
  });
});
