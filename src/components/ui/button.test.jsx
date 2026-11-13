import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('shadcn Button', () => {
  it('글자를 가진 버튼으로 그려지고 shadcn 표식(data-slot)이 붙는다', () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole('button', { name: '저장' })).toHaveAttribute('data-slot', 'button');
  });

  it('종류를 정하지 않으면 default(주 동작) 모양이다', () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it.each([
    ['default', ['bg-primary', 'text-primary-foreground']],
    ['outline', ['border-border', 'bg-background']],
    ['secondary', ['bg-secondary', 'text-secondary-foreground']],
    ['ghost', ['hover:bg-muted']],
    ['destructive', ['bg-destructive/10', 'text-destructive']],
    ['link', ['text-primary', 'hover:underline']],
  ])('%s 종류의 모양이 맞다', (variant, classes) => {
    render(<Button variant={variant}>버튼</Button>);
    expect(screen.getByRole('button')).toHaveClass(...classes);
  });

  it.each([
    ['default', 'h-8'],
    ['sm', 'h-7'],
    ['lg', 'h-9'],
    ['xs', 'h-6'],
    ['icon', 'size-8'],
  ])('크기 %s는 %s 이다', (size, expected) => {
    render(<Button size={size}>버튼</Button>);
    expect(screen.getByRole('button')).toHaveClass(expected);
  });

  it('className을 주면 덧붙고, 충돌하는 기본 클래스는 대체된다', () => {
    render(<Button className="w-full h-10">버튼</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full', 'h-10');
    expect(button).not.toHaveClass('h-8');
  });

  it('누르면 onClick이 호출된다', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled이면 눌러도 호출되지 않는다', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>저장</Button>);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
