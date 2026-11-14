import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { COLOR_PALETTE } from '../constants/colors';

// 앱 전체를 사람처럼 눌러 보는 시험(App.*.test.jsx)이 함께 쓰는 도우미 모음.
// 시험 속 "오늘"은 2026-06-15로 고정한다. 그래서 처음 보이는 달력은 2026년 + 2027년이다.

// 시험 파일 맨 위에서 한 번 부르면, 시험마다 저장소를 비우고 시계를 고정하며 끝나면 원래대로 돌려놓는다.
export const setupTestEnvironment = () => {
  beforeEach(() => {
    localStorage.clear();
    // Date만 고정하고 시간은 실제로 흐르게 한다. (일정 id가 현재 시각으로 만들어지므로, 시계가 멈춰 있으면 id가 겹친다)
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
};

// --- 시험 도우미 -----------------------------------------------------------------------------
// 날짜마다 "상세 일정 관리" 날짜 버튼이 정확히 하나씩 있고 날짜 순서대로 놓여 있으므로,
// "시작 연도 1월 1일로부터 며칠째인가"로 몇 번째 날짜 버튼인지 계산해서 칸을 찾는다. (아래 '시험 도우미 점검'에서 확인)
// (730개 중에서 이름으로 찾는 것보다 title로 모아 순서로 고르는 쪽이 훨씬 빠르다)
const DAY_MS = 24 * 60 * 60 * 1000;

export const dayButtonOf = (date, startYear = 2026) => {
  const [y, m, d] = date.split('-').map(Number);
  const index = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(startYear, 0, 1)) / DAY_MS);
  return screen.getAllByTitle('상세 일정 관리')[index];
};
export const cellOf = (date, startYear) => dayButtonOf(date, startYear).closest('[class~="group/cell"]');

// 팝업(role="dialog")은 제목 글자로 찾는다. 다른 팝업이 위에 겹쳐 있으면 아래 팝업은 접근성 트리에서 가려지므로 hidden: true로 찾는다.
export const popup = (title) => screen.getByRole('dialog', { name: title, hidden: true });
export const queryPopup = (title) => screen.queryByRole('dialog', { name: title, hidden: true });
export const popupCount = () => document.querySelectorAll('[role="dialog"]').length;

export const buttonIn = (box, name) => within(box).getByRole('button', { name });
export const colorButtonsIn = (box) => within(box).getAllByRole('button').filter((b) => b.classList.contains('rounded-full'));

// 일정 막대(색 상자)와 그 안의 아이콘 버튼. 아이콘 버튼은 접근성 이름("<일정명> 수정", "<일정명> 삭제")으로 찾는다.
export const barIn = (container, title) => within(container).getByText(title).parentElement;
export const editIconOf = (bar) => within(bar).getByRole('button', { name: /수정$/ });
export const deleteIconOf = (bar) => within(bar).getByRole('button', { name: /삭제$/ });

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
export const COLOR = {
  blue: COLOR_PALETTE[0].value,
  purple: COLOR_PALETTE[1].value,
  pink: COLOR_PALETTE[2].value,
  amber: COLOR_PALETTE[3].value,
  mint: COLOR_PALETTE[4].value,
};

// 저장소에 미리 넣어 두는 데이터
export const makeEvent = (id, title, start, end = start, color = COLOR.blue) => ({
  id, title, start_date: start, end_date: end, color,
});
export const seedEvents = (events) => localStorage.setItem('planner_events', JSON.stringify(events));
export const seedDaily = (daily) => localStorage.setItem('planner_daily', JSON.stringify(daily));
export const stored = (key) => JSON.parse(localStorage.getItem(key));

export const setup = () => {
  const user = userEvent.setup({ delay: null }); // 글자 사이에 쉬는 시간을 두지 않는다
  render(<App />);
  return user;
};

// 날짜 칸을 마우스로 눌러서 끌었다 놓는다
export const drag = (user, from, to) =>
  user.pointer([
    { keys: '[MouseLeft>]', target: cellOf(from) },
    { target: cellOf(to) },
    { keys: '[/MouseLeft]' },
  ]);
