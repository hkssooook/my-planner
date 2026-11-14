import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App';
import { setupTestEnvironment, cellOf, makeEvent, seedEvents, setup, plusButtonOf, barIn, popup, drag, editIconOf } from './test/helpers';
import { COLOR_PALETTE } from './constants/colors';

// 화면을 눈으로 못 보는 사람(스크린 리더)이 버튼을 알아들을 수 있는지 확인하는 시험.
// 이름이 없는 버튼은 "버튼"이라고만 읽혀서 무엇을 하는 버튼인지 알 수 없다.

setupTestEnvironment();

const sameDay = '2026-01-06';
const fourEvents = () => [
  makeEvent(1, '일정 하나', sameDay), makeEvent(2, '일정 둘', sameDay), makeEvent(3, '일정 셋', sameDay), makeEvent(4, '일정 넷', sameDay),
];

describe('접근성: 아이콘 버튼의 이름', () => {
  it('일정 막대의 연필·X 버튼은 어떤 일정의 것인지 이름에 들어 있다', () => {
    seedEvents([makeEvent(1, '여름 워크숍', '2026-01-05')]);
    render(<App />);
    const bar = barIn(cellOf('2026-01-05'), '여름 워크숍');
    expect(within(bar).getByRole('button', { name: '여름 워크숍 수정' })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: '여름 워크숍 삭제' })).toBeInTheDocument();
  });

  it('같은 날 일정이 여러 개여도 버튼 이름이 서로 다르다 (이름으로 어느 일정인지 구분된다)', () => {
    seedEvents([makeEvent(1, '가 일정', '2026-01-05'), makeEvent(2, '나 일정', '2026-01-05')]);
    render(<App />);
    const names = within(cellOf('2026-01-05')).getAllByRole('button').map((b) => b.getAttribute('aria-label')).filter(Boolean);
    expect(names).toEqual(expect.arrayContaining(['가 일정 수정', '가 일정 삭제', '나 일정 수정', '나 일정 삭제']));
    expect(new Set(names).size).toBe(names.length);
  });

  it('"더보기" 팝업의 연필·X 버튼도 일정 이름이 들어 있다', async () => {
    seedEvents(fourEvents());
    const user = setup();
    await user.click(within(cellOf(sameDay)).getByText('+1 더보기'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '일정 넷 수정' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '일정 넷 삭제' })).toBeInTheDocument();
  });

  it('칸의 + 버튼 이름에 날짜가 들어 있어서, 730개가 모두 다른 이름이다', () => {
    render(<App />);
    expect(plusButtonOf('2026-01-05')).toHaveAccessibleName('2026-01-05 개별 일정 등록');
    const names = screen.getAllByTitle('개별 일정 등록').map((b) => b.getAttribute('aria-label'));
    expect(names).toHaveLength(730);
    expect(new Set(names).size).toBe(730);
  });

  it('아이콘 그림(svg)은 스크린 리더가 읽지 않게 숨겨져 있다 (이름은 버튼에 있으므로)', () => {
    seedEvents([makeEvent(1, '여름 워크숍', '2026-01-05')]);
    render(<App />);
    const bar = barIn(cellOf('2026-01-05'), '여름 워크숍');
    const icons = bar.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'));
    expect(plusButtonOf('2026-01-05').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('접근성: 보기 방식 버튼', () => {
  it('지금 선택된 보기 방식이 눌림(aria-pressed) 상태로 알려진다', async () => {
    const user = setup();
    expect(screen.getByRole('button', { name: '가로 스크롤' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '화면 맞춤' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: '화면 맞춤' }));
    expect(screen.getByRole('button', { name: '가로 스크롤' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '화면 맞춤' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('접근성: 색 선택 버튼', () => {
  it('색 버튼마다 색 이름이 있고, 지금 고른 색만 눌림 상태다 (기간 등록 팝업)', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const group = within(popup('기간 일정 등록')).getByRole('group', { name: '일정 색' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(COLOR_PALETTE.map((c) => c.name));
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false']);

    await user.click(within(group).getByRole('button', { name: '핑크' }));
    expect(within(group).getByRole('button', { name: '핑크' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '블루' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('상세 일정 팝업에는 선택기가 여러 개라서, 묶음 이름이 서로 다르다 (종일 1개 + 시간대마다 1개)', async () => {
    const user = setup();
    await user.click(plusButtonOf('2026-01-05'));
    const box = popup('상세 일정 관리');
    expect(within(box).getByRole('group', { name: '전체(종일) 일정 색' })).toBeInTheDocument();
    expect(within(box).getByRole('group', { name: '00:00 일정 색' })).toBeInTheDocument();
    expect(within(box).getByRole('group', { name: '09:00 일정 색' })).toBeInTheDocument();
    const names = within(box).getAllByRole('group').map((g) => g.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
  });

  it('수정 팝업은 일정의 현재 색이 눌림 상태로 보인다', async () => {
    seedEvents([makeEvent(1, '색 확인', '2026-01-05', '2026-01-05', COLOR_PALETTE[3].value)]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '색 확인')));
    const group = within(popup('일정 수정')).getByRole('group', { name: '일정 색' });
    expect(within(group).getByRole('button', { name: '앰버' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '블루' })).toHaveAttribute('aria-pressed', 'false');
  });
});

