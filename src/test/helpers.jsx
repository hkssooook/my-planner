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
// 이 앱의 화면에는 날짜 칸을 가리키는 이름표가 없다. 날짜마다 `+` 버튼이 정확히 하나씩 있고 날짜 순서대로 놓여 있으므로,
// "시작 연도 1월 1일로부터 며칠째인가"로 몇 번째 `+` 버튼인지 계산해서 칸을 찾는다. (아래 '시험 도우미 점검'에서 확인)
const DAY_MS = 24 * 60 * 60 * 1000;

export const plusButtonOf = (date, startYear = 2026) => {
  const [y, m, d] = date.split('-').map(Number);
  const index = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(startYear, 0, 1)) / DAY_MS);
  return screen.getAllByTitle('개별 일정 등록')[index];
};
export const cellOf = (date, startYear) => plusButtonOf(date, startYear).closest('[class~="group/cell"]');

// 팝업(role="dialog")은 제목 글자로 찾는다. 다른 팝업이 위에 겹쳐 있으면 아래 팝업은 접근성 트리에서 가려지므로 hidden: true로 찾는다.
export const popup = (title) => screen.getByRole('dialog', { name: title, hidden: true });
export const queryPopup = (title) => screen.queryByRole('dialog', { name: title, hidden: true });
export const popupCount = () => document.querySelectorAll('[role="dialog"]').length;

export const buttonIn = (box, name) => within(box).getByRole('button', { name });
export const colorButtonsIn = (box) => within(box).getAllByRole('button').filter((b) => b.classList.contains('rounded-full'));

// 일정 막대(색 상자)와 그 안의 아이콘 버튼. 아이콘 버튼에 이름이 없어서 순서로 찾는다: [0]=연필(수정), [1]=X(삭제)
export const barIn = (container, title) => within(container).getByText(title).parentElement;
export const editIconOf = (bar) => within(bar).getAllByRole('button')[0];
export const deleteIconOf = (bar) => within(bar).getAllByRole('button')[1];

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
export const COLOR = {
  blue: COLOR_PALETTE[0].value,
  green: COLOR_PALETTE[1].value,
  orange: COLOR_PALETTE[2].value,
  red: COLOR_PALETTE[3].value,
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
