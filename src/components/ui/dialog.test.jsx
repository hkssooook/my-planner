import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const renderOpen = (props = {}, contentProps = {}) =>
  render(
    <Dialog open onOpenChange={props.onOpenChange ?? (() => {})}>
      <DialogContent {...contentProps}>
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
          <DialogDescription>이름과 기간을 바꿉니다</DialogDescription>
        </DialogHeader>
        <DialogFooter>푸터 내용</DialogFooter>
      </DialogContent>
    </Dialog>,
  );

describe('shadcn Dialog (Base UI)', () => {
  it('열려 있지 않으면 아무것도 그리지 않는다', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogContent><DialogTitle>숨김</DialogTitle></DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('role="dialog"가 자동으로 붙고, 제목이 접근성 이름이 된다', () => {
    renderOpen();
    expect(screen.getByRole('dialog', { name: '일정 수정' })).toBeInTheDocument();
  });

  it('설명이 접근성 설명으로 연결된다', () => {
    renderOpen();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('이름과 기간을 바꿉니다');
  });

  it('배경(overlay)과 내용(content)에 shadcn 표식이 붙는다', () => {
    renderOpen();
    expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-slot', 'dialog-content');
  });

  it('기본으로 오른쪽 위에 닫기 버튼이 있고, 누르면 닫힘을 요청한다', async () => {
    const onOpenChange = vi.fn();
    renderOpen({ onOpenChange });
    await userEvent.setup().click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });

  it('showCloseButton={false}이면 닫기 버튼이 없다', () => {
    renderOpen({}, { showCloseButton: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Esc 키를 누르면 닫힘을 요청한다', async () => {
    const onOpenChange = vi.fn();
    renderOpen({ onOpenChange });
    await userEvent.setup().keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(false);
  });

  it('트리거를 누르면 열리고, 닫기를 누르면 다시 닫힌다 (스스로 상태를 관리할 때)', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<button>열기</button>} />
          <DialogContent><DialogTitle>제목</DialogTitle></DialogContent>
        </Dialog>
      );
    }
    render(<Example />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '열기' }));
    expect(await screen.findByRole('dialog', { name: '제목' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('기본 모양: 안쪽 여백 p-4, 둥근 모서리, 약한 배경(검정 10%)이다 (nova 기본값)', () => {
    renderOpen();
    expect(screen.getByRole('dialog')).toHaveClass('p-4', 'rounded-xl', 'gap-4');
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass('bg-black/10');
  });

  it('푸터는 기본으로 회색 띠(bg-muted/50 + 위쪽 테두리)이고 오른쪽 정렬이다 (nova 기본값)', () => {
    renderOpen();
    expect(screen.getByText('푸터 내용')).toHaveClass('border-t', 'bg-muted/50', 'sm:justify-end');
  });
});
