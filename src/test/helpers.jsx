import { vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { COLOR_PALETTE } from '../constants/colors';
import { ROW } from '../components/panels/TimeGrid';

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
// 날짜 칸은 칸에 붙은 날짜 표시(data-date)로 찾는다. 연 보기·월 보기 어디서나 같다.
export const cellOf = (date) => document.querySelector(`[data-date="${date}"]`);
// 그 칸의 날짜 버튼 (키보드·화면 낭독기용 입구)
export const dayButtonOf = (date) => cellOf(date)?.querySelector('[title="상세 일정 관리"]');

// 팝업(role="dialog")은 제목 글자로 찾는다. 다른 팝업이 위에 겹쳐 있으면 아래 팝업은 접근성 트리에서 가려지므로 hidden: true로 찾는다.
export const popup = (title) => screen.getByRole('dialog', { name: title, hidden: true });
export const queryPopup = (title) => screen.queryByRole('dialog', { name: title, hidden: true });
export const popupCount = () => document.querySelectorAll('[role="dialog"]').length;

// 오른쪽 일정 패널(<aside aria-label="상세 일정 관리">). 팝업이 아니라서 role이 complementary(보조 영역)다.
export const dayPanel = () => screen.getByRole('complementary', { name: '상세 일정 관리', hidden: true });
export const queryDayPanel = () => screen.queryByRole('complementary', { name: '상세 일정 관리', hidden: true });

// 일정 패널 오른쪽의 시간 일정 카드 상세 패널
export const blockPanel = () => screen.getByRole('complementary', { name: '시간 일정 상세', hidden: true });
export const queryBlockPanel = () => screen.queryByRole('complementary', { name: '시간 일정 상세', hidden: true });

// 일정 패널 오른쪽의 새 일정 패널 ([시간 일정 | 종일 일정], 저장해야 생긴다)
export const newPanel = () => screen.getByRole('complementary', { name: '새 일정', hidden: true });
export const queryNewPanel = () => screen.queryByRole('complementary', { name: '새 일정', hidden: true });

// 일정 패널 오른쪽의 기간 일정 상세 패널
export const eventPanel = () => screen.getByRole('complementary', { name: '기간 일정 상세', hidden: true });
export const queryEventPanel = () => screen.queryByRole('complementary', { name: '기간 일정 상세', hidden: true });

// 일정 패널의 30분 시간표. 시험 환경(jsdom)은 화면 배치를 계산하지 않아 시간표의 위쪽 끝이 0이므로,
// 칸 번호 × ROW(한 칸 높이)이 곧 그 칸의 세로 위치다. (+5는 칸 안쪽을 누르려고)
// 일정 패널 맨 아래 저장 줄의 [저장]을 누른다 (고친 내용은 저장을 눌러야 저장소·달력에 반영된다)
// 저장할 것이 없거나(저장 줄이 "저장됨") 패널이 닫혀 있으면 아무것도 하지 않는다.
export const saveChanges = async (user) => {
  const panel = queryDayPanel();
  const bar = panel && within(panel).queryByTestId('save-bar'); // 일정 패널의 저장 줄 (두 번째 패널에도 같은 줄이 있다)
  const button = bar && within(bar).queryByRole('button', { name: '저장' });
  if (button) await user.click(button);
};
// 일정 패널의 보기 방식을 "시간표"로 바꾼다 (패널은 처음에 "목록"으로 열린다)
export const showTimetable = (user) => user.click(within(dayPanel()).getByRole('tab', { name: '시간표' }));
export const timeGrid = () => within(dayPanel()).getByTestId('time-grid');
const slotY = (slot) => slot * ROW + 5;
// 시간표의 fromSlot 칸을 눌러 toSlot 칸까지 끌었다 놓는다. 예: dragTime(18, 20) = 09:00~10:30
export const dragTime = (fromSlot, toSlot = fromSlot) => {
  fireEvent.mouseDown(timeGrid(), { button: 0, clientY: slotY(fromSlot) });
  fireEvent.mouseMove(window, { clientY: slotY(toSlot) });
  fireEvent.mouseUp(window, { clientY: slotY(toSlot) });
};
// 시간표 안의 카드 버튼 (접근성 이름 "09:00–10:00 회의" 처럼 시각으로 시작)
export const timeCard = (startTime) => within(dayPanel()).getByRole('button', { name: new RegExp(`^${startTime}–`) });
// startTime에 시작하는 카드를 fromSlot 칸에서 잡아 toSlot 칸까지 끌었다 놓는다.
//   edge 없음: 가운데를 잡고 옮기기,  edge='start' | 'end': 위·아래 가장자리를 잡고 길이 바꾸기
export const dragCard = (startTime, fromSlot, toSlot, edge) => {
  const card = timeCard(startTime);
  const grip = edge ? card.querySelector(`[data-edge="${edge}"]`) : card;
  fireEvent.mouseDown(grip, { button: 0, clientY: slotY(fromSlot) });
  fireEvent.mouseMove(window, { clientY: slotY(toSlot) });
  fireEvent.mouseUp(window, { clientY: slotY(toSlot) });
};

export const buttonIn = (box, name) => within(box).getByRole('button', { name });
export const colorButtonsIn = (box) => within(box).getAllByRole('button').filter((b) => b.classList.contains('rounded-full'));

// 일정 막대(색 상자): 일정 이름 글자의 바로 바깥 상자
export const barIn = (container, title) => within(container).getByText(title).parentElement;

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
