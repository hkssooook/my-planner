import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectBox from './SelectBox';

describe('SelectBox (작은 드롭박스)', () => {
  it('기본 화살표를 숨기고, 왼쪽 글자 여백과 오른쪽 화살표 여백을 똑같이 10px로 둔다', () => {
    render(<SelectBox aria-label="시작 시각" defaultValue="1"><option value="1">09:00</option></SelectBox>);
    const select = screen.getByRole('combobox', { name: '시작 시각' });
    expect(select).toHaveClass('appearance-none', 'pl-2.5'); // 왼쪽 10px
    const arrow = select.parentElement.querySelector('svg');
    expect(arrow).toHaveClass('right-2.5', 'pointer-events-none'); // 오른쪽 10px, 눌러도 드롭박스가 열리게
  });

  it('넘긴 속성(이름·값·onChange)은 그대로 <select>에 전달된다', async () => {
    const onChange = vi.fn();
    render(
      <SelectBox aria-label="끝 시각" value="1" onChange={onChange}>
        <option value="1">10:00</option>
        <option value="2">10:30</option>
      </SelectBox>,
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '끝 시각' }), '10:30');
    expect(onChange).toHaveBeenCalled();
  });
});
