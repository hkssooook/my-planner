import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

const BASE_CLASSES = ['px-4', 'py-2', 'rounded-md', 'text-sm', 'font-medium'];

describe('Button (팝업의 동작 버튼)', () => {
  it('글자를 그대로 보여 주는 버튼이다', () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('종류를 정하지 않으면 primary(주 동작) 모양이다', () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-500', 'text-white', 'hover:bg-blue-600');
  });

  it.each([
    ['primary', ['bg-blue-500', 'text-white', 'hover:bg-blue-600']],
    ['outline', ['bg-white', 'border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-50']],
    ['destructive', ['bg-red-600', 'text-white', 'hover:bg-red-700']],
    ['destructive-soft', ['bg-red-50', 'text-red-700', 'hover:bg-red-100']],
  ])('%s 종류의 모양이 맞다', (variant, classes) => {
    render(<Button variant={variant}>버튼</Button>);
    expect(screen.getByRole('button')).toHaveClass(...classes);
  });

  it.each(['primary', 'outline', 'destructive', 'destructive-soft'])(
    '%s 종류도 같은 크기·모서리·글자 모양을 쓴다 (종류가 달라도 버튼 크기는 같아야 한다)',
    (variant) => {
      render(<Button variant={variant}>버튼</Button>);
      expect(screen.getByRole('button')).toHaveClass(...BASE_CLASSES);
    },
  );

  it('종류마다 서로 다른 색을 쓴다 (한 종류의 색이 다른 종류로 섞이지 않는다)', () => {
    render(
      <>
        <Button variant="primary">가</Button>
        <Button variant="destructive">나</Button>
        <Button variant="destructive-soft">다</Button>
      </>,
    );
    expect(screen.getByText('나')).not.toHaveClass('bg-blue-500', 'bg-red-50');
    expect(screen.getByText('다')).not.toHaveClass('bg-red-600', 'text-white');
    expect(screen.getByText('가')).not.toHaveClass('bg-red-600', 'bg-red-50');
  });

  it('className으로 배치 클래스를 덧붙일 수 있고, 기본 모양은 그대로 유지된다', () => {
    render(<Button variant="outline" className="flex-1">취소</Button>);
    expect(screen.getByRole('button')).toHaveClass('flex-1', 'bg-white', 'border', ...BASE_CLASSES);
  });

  it('className을 주지 않으면 클래스 끝에 쓸데없는 공백이 붙지 않는다', () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole('button').getAttribute('class')).toBe(
      'px-4 py-2 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600',
    );
  });

  it('누르면 onClick이 한 번 호출된다', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled이면 눌러도 onClick이 호출되지 않는다', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>저장</Button>);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('그 밖의 속성(aria-label 등)도 버튼에 그대로 전달된다', () => {
    render(<Button aria-label="저장하기" type="submit">저장</Button>);
    const button = screen.getByRole('button', { name: '저장하기' });
    expect(button).toHaveAttribute('type', 'submit');
  });
});
