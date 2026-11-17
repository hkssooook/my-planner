import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App';
import { setupTestEnvironment, cellOf, makeEvent, seedEvents, setup, dayButtonOf, dayPanel, drag, blockPanel, eventPanel, dragTime, timeCard, showTimetable, newPanel } from './test/helpers';
import { COLOR_PALETTE } from './constants/colors';

// 화면을 눈으로 못 보는 사람(스크린 리더)이 버튼을 알아들을 수 있는지 확인하는 시험.
// 이름이 없는 버튼은 "버튼"이라고만 읽혀서 무엇을 하는 버튼인지 알 수 없다.

setupTestEnvironment();


describe('접근성: 아이콘 버튼의 이름', () => {
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

});

describe('접근성: 기간 일정', () => {
  it('달력 막대와 패널 목록에는 연필·X 버튼이 없고, 패널 목록의 띠는 일정 이름으로 읽히는 버튼이다', async () => {
    seedEvents([makeEvent(1, '가 일정', '2026-01-05'), makeEvent(2, '나 일정', '2026-01-05')]);
    const user = setup();
    expect(within(cellOf('2026-01-05')).queryByRole('button', { name: /수정$|삭제$/ })).toBeNull();
    await user.click(dayButtonOf('2026-01-05'));
    const box = dayPanel();
    expect(within(box).queryByRole('button', { name: /수정$|삭제$/ })).toBeNull();
    expect(within(box).getByRole('button', { name: /^가 일정/ })).toHaveAttribute('aria-pressed', 'false');
    expect(within(box).getByRole('button', { name: /^나 일정/ })).toBeInTheDocument();
  });

  it('기간 일정 상세 패널의 입력칸·색 묶음에 이름이 있고, 지금 색이 눌림 상태로 보인다', async () => {
    seedEvents([makeEvent(1, '여름 워크숍', '2026-01-05', '2026-01-07', COLOR_PALETTE[2].value)]);
    const user = setup();
    await user.click(within(cellOf('2026-01-05')).getByText('여름 워크숍'));
    const box = eventPanel();
    expect(within(box).getByLabelText('이름')).toHaveValue('여름 워크숍');
    expect(within(box).getByLabelText('시작일')).toHaveValue('2026-01-05');
    expect(within(box).getByLabelText('종료일')).toHaveValue('2026-01-07');
    const group = within(box).getByRole('group', { name: '기간 일정 색' });
    expect(within(group).getByRole('button', { name: COLOR_PALETTE[2].name })).toHaveAttribute('aria-pressed', 'true');
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
  it('색 버튼마다 색 이름이 있고, 지금 고른 색만 눌림 상태다 (새 일정 패널)', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const group = within(newPanel()).getByRole('group', { name: '새 일정 색' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(COLOR_PALETTE.map((c) => c.name));
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false']);

    await user.click(within(group).getByRole('button', { name: '핑크' }));
    expect(within(group).getByRole('button', { name: '핑크' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '블루' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('새 일정 패널의 색 선택기와 카드 상세 패널의 색 선택기는 이름이 서로 다르다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(within(dayPanel()).getByRole('button', { name: '+ 일정 더하기' }));
    expect(within(newPanel()).getByRole('group', { name: '새 일정 색' })).toBeInTheDocument();
    await user.click(within(newPanel()).getByRole('button', { name: '취소' }));
    await showTimetable(user);
    dragTime(18);
    expect(within(blockPanel()).getByRole('group', { name: '시간 일정 색' })).toBeInTheDocument();
  });

});

describe('접근성: 입력칸의 이름', () => {
  it('새 일정 패널의 이름·날짜·시각 입력칸에 이름이 있다 (안내 글자만 있으면 이름이 아니다)', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const box = newPanel();
    expect(within(box).getByRole('textbox', { name: '이름' })).toBeInTheDocument();
    expect(within(box).getByLabelText('새 일정 시작일')).toBeInTheDocument();
    expect(within(box).getByLabelText('새 일정 종료일')).toBeInTheDocument();
    expect(within(box).getByRole('tablist', { name: '일정 종류' })).toBeInTheDocument();
    await user.click(within(box).getByRole('tab', { name: '시간 일정' }));
    expect(within(box).getByRole('combobox', { name: '새 일정 시작 시각' })).toBeInTheDocument();
    expect(within(box).getByRole('combobox', { name: '새 일정 끝 시각' })).toBeInTheDocument();
  });

  it('일정 패널: 시간 일정 추가 칸(시작·끝 시각)에 이름이 있고, 시간표 카드는 시각과 이름으로 읽힌다', async () => {
    localStorage.setItem('planner_time_blocks', JSON.stringify({ '2026-01-05': [
      { id: 'a', start: '09:30', end: '11:00', content: '회의', color: COLOR_PALETTE[0].value, is_important: true },
    ] }));
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    const box = dayPanel();
    await showTimetable(user);
    expect(within(box).getByRole('combobox', { name: '시작 시각' })).toBeInTheDocument();
    expect(within(box).getByRole('combobox', { name: '끝 시각' })).toBeInTheDocument();
    expect(within(box).getByRole('button', { name: '09:30–11:00 회의 (주요)' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('카드 상세 패널: 이름 입력칸과 주요 체크박스가 이름으로 찾아지고, 쓰면 그 카드에 저장된다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await showTimetable(user);
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

