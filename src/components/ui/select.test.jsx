import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const YEARS = [
  { value: '2025', label: '2025년' },
  { value: '2026', label: '2026년' },
  { value: '2027', label: '2027년' },
];

const renderSelect = ({ value = '2026', onValueChange = () => {}, items, size } = {}) =>
  render(
    <Select value={value} onValueChange={onValueChange} items={items}>
      <SelectTrigger aria-label="연도" size={size}><SelectValue /></SelectTrigger>
      <SelectContent>
        {YEARS.map((y) => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
      </SelectContent>
    </Select>,
  );

// 목록 열기는 키보드(Enter)로 한다. 마우스 클릭은 누르고 떼는 사이가 너무 짧으면 Base UI Select가 열렸다 바로 닫혀서, 시험이 가끔 실패했다.
const openSelect = async (user) => {
  screen.getByRole('combobox').focus();
  await user.keyboard('{Enter}');
};

describe('shadcn Select (Base UI)', () => {
  it('접근성 이름을 가진 콤보박스로 그려진다', () => {
    renderSelect();
    expect(screen.getByRole('combobox', { name: '연도' })).toBeInTheDocument();
  });

  it('열려 있지 않으면 옵션 목록이 보이지 않는다', () => {
    renderSelect();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('누르면 옵션 목록이 열리고 모든 선택지가 보인다', async () => {
    renderSelect();
    await openSelect(userEvent.setup());
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['2025년', '2026년', '2027년']);
  });

  it('현재 선택된 옵션이 선택 표시(aria-selected)를 갖는다', async () => {
    renderSelect({ value: '2027' });
    await openSelect(userEvent.setup());
    expect(screen.getByRole('option', { name: '2027년' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: '2025년' })).toHaveAttribute('aria-selected', 'false');
  });

  it('옵션을 고르면 onValueChange가 그 값(글자가 아니라 값)으로 호출되고 목록이 닫힌다', async () => {
    const onValueChange = vi.fn();
    renderSelect({ onValueChange });
    const user = userEvent.setup();
    await openSelect(user);
    await user.click(screen.getByRole('option', { name: '2027년' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBe('2027');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('키보드로도 고를 수 있다 (열기 → 아래 화살표 → Enter)', async () => {
    const onValueChange = vi.fn();
    renderSelect({ onValueChange });
    const user = userEvent.setup();
    screen.getByRole('combobox').focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('Esc를 누르면 값을 바꾸지 않고 목록만 닫힌다', async () => {
    const onValueChange = vi.fn();
    renderSelect({ onValueChange });
    const user = userEvent.setup();
    await openSelect(user);
    await user.keyboard('{Escape}');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('items(값→글자 목록)을 주지 않으면 트리거에 글자가 아니라 값("2026")이 보인다 (주의점)', () => {
    renderSelect();
    expect(screen.getByRole('combobox')).toHaveTextContent('2026');
    expect(screen.getByRole('combobox')).not.toHaveTextContent('2026년');
  });

  it('items(값→글자 목록)을 주면 트리거에 글자("2026년")가 보인다', () => {
    renderSelect({ items: YEARS });
    expect(screen.getByRole('combobox')).toHaveTextContent('2026년');
  });

  it('기본 크기는 높이 h-8 (32px), size="sm"이면 h-7 이다 (nova 기본값)', () => {
    const { unmount } = renderSelect();
    expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'default');
    expect(screen.getByRole('combobox')).toHaveClass('data-[size=default]:h-8');
    unmount();
    renderSelect({ size: 'sm' });
    expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'sm');
  });
});
