import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App';
import { setupTestEnvironment, cellOf, makeEvent, seedEvents, setup, dayButtonOf, barIn, dayPanel, popup, drag, editIconOf, blockPanel, dragTime, timeCard } from './test/helpers';
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

  it('일정 패널의 연필·X 버튼도 일정 이름이 들어 있다', async () => {
    seedEvents(fourEvents());
    const user = setup();
    await user.click(within(cellOf(sameDay)).getByText('+1 더보기'));
    const box = dayPanel();
    expect(within(box).getByRole('button', { name: '일정 넷 수정' })).toBeInTheDocument();
    expect(within(box).getByRole('button', { name: '일정 넷 삭제' })).toBeInTheDocument();
  });

  it('일정 패널의 ‹ › X 버튼에 이름이 있다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    const box = dayPanel();
    for (const name of ['전날', '다음 날', '닫기']) {
      expect(within(box).getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('칸의 날짜 버튼 이름에 날짜가 들어 있어서, 730개가 모두 다른 이름이다', () => {
    render(<App />);
    expect(dayButtonOf('2026-01-05')).toHaveAccessibleName('2026-01-05 상세 일정 관리');
    const names = screen.getAllByTitle('상세 일정 관리').map((b) => b.getAttribute('aria-label'));
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
  });
});

describe('접근성: 보기 방식 탭', () => {
  it('보기 방식은 이름 있는 탭 묶음이고, 지금 선택된 것이 선택(aria-selected) 상태로 알려진다', async () => {
    const user = setup();
    expect(screen.getByRole('tablist', { name: '보기 방식' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '가로 스크롤' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '화면 맞춤' })).toHaveAttribute('aria-selected', 'false');
    await user.click(screen.getByRole('tab', { name: '화면 맞춤' }));
    expect(screen.getByRole('tab', { name: '가로 스크롤' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: '화면 맞춤' })).toHaveAttribute('aria-selected', 'true');
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

  it('일정 패널의 종일 색 선택기와 카드 상세 패널의 색 선택기는 이름이 서로 다르다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    expect(within(dayPanel()).getByRole('group', { name: '종일 일정 색' })).toBeInTheDocument();
    dragTime(18);
    expect(within(blockPanel()).getByRole('group', { name: '시간 일정 색' })).toBeInTheDocument();
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

describe('접근성: 입력칸의 이름', () => {
  it('수정 팝업: 일정명·시작일·종료일 이름표가 입력칸과 이어져 있다 (이름표로 입력칸을 찾을 수 있다)', async () => {
    seedEvents([makeEvent(1, '이름 확인', '2026-01-05', '2026-01-07')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '이름 확인')));
    const box = popup('일정 수정');
    expect(within(box).getByLabelText('일정명')).toHaveValue('이름 확인');
    expect(within(box).getByLabelText('시작일')).toHaveValue('2026-01-05');
    expect(within(box).getByLabelText('종료일')).toHaveValue('2026-01-07');
  });

  it('수정 팝업의 이름표를 눌러도 입력칸에 글자가 들어간다 (이름표와 입력칸이 실제로 연결됨)', async () => {
    seedEvents([makeEvent(1, '이름 확인', '2026-01-05')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '이름 확인')));
    const box = popup('일정 수정');
    await user.click(within(box).getByText('일정명'));
    await user.keyboard('!');
    expect(within(box).getByLabelText('일정명')).toHaveValue('이름 확인!');
  });

  it('기간 등록 팝업의 일정명 입력칸에 이름이 있다 (안내 글자만 있으면 이름이 아니다)', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    expect(within(popup('기간 일정 등록')).getByRole('textbox', { name: '일정명' })).toBeInTheDocument();
  });

  it('일정 패널: 종일 입력칸, 시간 일정 추가 칸(시작·끝 시각)에 이름이 있고, 시간표 카드는 시각과 이름으로 읽힌다', async () => {
    localStorage.setItem('planner_time_blocks', JSON.stringify({ '2026-01-05': [
      { id: 'a', start: '09:30', end: '11:00', content: '회의', color: COLOR_PALETTE[0].value, is_important: true },
    ] }));
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    const box = dayPanel();
    expect(within(box).getByRole('textbox', { name: '종일 일정명' })).toBeInTheDocument();
    expect(within(box).getByRole('combobox', { name: '시작 시각' })).toBeInTheDocument();
    expect(within(box).getByRole('combobox', { name: '끝 시각' })).toBeInTheDocument();
    expect(within(box).getByRole('button', { name: '09:30–11:00 회의 (주요)' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('카드 상세 패널: 이름 입력칸과 주요 체크박스가 이름으로 찾아지고, 쓰면 그 카드에 저장된다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    dragTime(20); // 10:00 칸
    const detail = blockPanel();
    await user.type(within(detail).getByRole('textbox', { name: '이름' }), '열 시 회의');
    await user.click(within(detail).getByRole('checkbox', { name: '주요 일정 (달력에 ★ 표시)' }));
    expect(JSON.parse(localStorage.getItem('planner_time_blocks'))['2026-01-05']).toEqual([
      expect.objectContaining({ start: '10:00', end: '10:30', content: '열 시 회의', is_important: true }),
    ]);
    expect(timeCard('10:00')).toHaveAccessibleName('10:00–10:30 열 시 회의 (주요)');
  });
});

