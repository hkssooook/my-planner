import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { KR_HOLIDAYS } from './data/holidays';
import { setupTestEnvironment, COLOR, cellOf, blockPanel, dayButtonOf, dayPanel, eventPanel, newPanel, hexToRgb, makeEvent, seedDaily, seedEvents, setup } from './test/helpers';
import { eventColors } from './utils/color';

// 앱의 첫 화면과 머리말(연도 선택, 보기 방식)을 확인하는 시험.
// 공통 도우미와 "오늘 = 2026-06-15" 고정은 src/test/helpers.jsx 참고.

setupTestEnvironment();

// 연도 버튼("2026년 ⌄"). 누르면 펼침 상자(shadcn Popover) 안에 연도가 세로 탭(shadcn Tabs)으로 나온다.
const yearSelect = () => screen.getByRole('button', { name: /^연도 선택/ });
const openYear = async (user) => {
  await user.click(yearSelect());
};
// 보기 방식도 탭이라서, 연도 탭은 "연도" 탭 묶음 안에서만 찾는다. (상자가 닫혀 있으면 빈 목록)
const yearTabs = () => {
  const list = screen.queryByRole('tablist', { name: '연도' });
  return list ? within(list).getAllByRole('tab') : [];
};
const yearOptions = async (user) => {
  await openYear(user);
  return yearTabs().map((o) => o.textContent);
};
const pickYear = async (user, label) => {
  await openYear(user);
  await user.click(screen.getByRole('tab', { name: label }));
};

describe('시험 도우미 점검 (이게 틀리면 아래 시험 전체를 믿을 수 없다)', () => {
  it('날짜 표시(data-date)로 찾은 칸이 실제 날짜와 요일에 맞다', () => {
    render(<App />);
    expect(cellOf('2026-01-01')).toHaveTextContent(/^1 \(목\)/);
    expect(cellOf('2026-01-05')).toHaveTextContent(/^5 \(월\)/);
    expect(cellOf('2026-02-01')).toHaveTextContent(/^1 \(일\)/);
    expect(cellOf('2026-12-31')).toHaveTextContent(/^31 \(목\)/);
    expect(cellOf('2027-01-01')).toHaveTextContent(/^1 \(금\)/);
    expect(cellOf('2027-12-31')).toHaveTextContent(/^31 \(금\)/);
  });
});

describe('첫 화면', () => {
  it('제목, 올해로 시작하는 연도 선택, 올해와 다음 해의 달력이 보인다', () => {
    render(<App />);
    expect(screen.getByText('연간 플래너')).toBeInTheDocument();
    expect(yearSelect()).toHaveTextContent('2026년');
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('2027')).toBeInTheDocument();
    expect(screen.queryByText('2028')).not.toBeInTheDocument();
  });

  it('연도 선택지는 올해 기준 -1년 ~ +3년이다', async () => {
    const user = setup();
    const options = await yearOptions(user);
    expect(options).toEqual(['2025년', '2026년', '2027년', '2028년', '2029년']);
  });

  it('올해가 바뀌면 그 해로 시작하고, 연도 선택지도 그 해 기준으로 바뀐다', async () => {
    vi.setSystemTime(new Date(2029, 2, 1, 12, 0, 0)); // 시계를 2029년으로 옮긴다
    const user = setup();

    expect(yearSelect()).toHaveTextContent('2029년');
    expect(screen.getByText('2029')).toBeInTheDocument();
    expect(screen.getByText('2030')).toBeInTheDocument();
    const options = await yearOptions(user);
    expect(options).toEqual(['2028년', '2029년', '2030년', '2031년', '2032년']);
  });

  it('해가 바뀌는 순간(12월 31일 밤 → 1월 1일 새벽)을 정확히 구분한다', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
    const { unmount } = render(<App />);
    expect(yearSelect()).toHaveTextContent('2026년');
    unmount();

    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 0));
    render(<App />);
    expect(yearSelect()).toHaveTextContent('2027년');
  });

  it('두 해 분량(730일)의 날짜 칸이 있다', () => {
    render(<App />);
    expect(screen.getAllByTitle('상세 일정 관리')).toHaveLength(365 + 365);
  });

  it('저장해 둔 일정이 처음부터 해당 날짜 칸에 보인다', () => {
    seedEvents([makeEvent(1, '저장된 일정', '2026-01-05', '2026-01-06')]);
    render(<App />);
    expect(within(cellOf('2026-01-05')).getByText('저장된 일정')).toBeInTheDocument();
    expect(within(cellOf('2026-01-06')).getByText('저장된 일정')).toBeInTheDocument();
    expect(within(cellOf('2026-01-07')).queryByText('저장된 일정')).not.toBeInTheDocument();
  });

  it('시간대별 일정은 모두 칸에 시간과 함께 보이고, "주요"인 것에만 ★(주요) 표시가 붙는다', () => {
    seedDaily({
      '2026-01-05': [
        { hour: 9, content: '주요 회의', is_important: true, color: COLOR.purple },
        { hour: 14, content: '평범한 일정', is_important: false, color: COLOR.blue },
      ],
    });
    render(<App />);
    const cell = cellOf('2026-01-05');
    expect(within(cell).getByText('09:00')).toBeInTheDocument();
    expect(within(cell).getByText('14:00')).toBeInTheDocument();
    expect(within(cell).getByText('주요 회의').parentElement).toHaveTextContent('주요');
    expect(within(within(cell).getByText('평범한 일정').parentElement).queryByText('주요')).not.toBeInTheDocument();
    expect(within(cell).getAllByText('주요')).toHaveLength(1);
  });

  it('칸이 넘칠 때는 "주요" 일정을 먼저 고르고, 고른 것은 시간순으로 보인다', () => {
    seedDaily({
      '2026-01-05': [
        { hour: 9, content: '아침 일정', is_important: false, color: COLOR.blue },
        { hour: 10, content: '열 시 일정', is_important: false, color: COLOR.blue },
        { hour: 14, content: '오후 주요', is_important: true, color: COLOR.purple },
        { hour: 17, content: '저녁 주요', is_important: true, color: COLOR.purple },
      ],
    });
    render(<App />);
    const cell = cellOf('2026-01-05');
    const shown = within(cell).getAllByText(/^\d{2}:00$/).map((el) => el.textContent);
    expect(shown).toEqual(['09:00', '14:00', '17:00']);
    expect(within(cell).queryByText('열 시 일정')).not.toBeInTheDocument();
    expect(within(cell).getByText('+1 더보기')).toBeInTheDocument();
  });

  it('공휴일 데이터가 있는 날은 칸에 공휴일 이름이 보인다', () => {
    const [date, name] = Object.entries(KR_HOLIDAYS[2026])[0];
    render(<App />);
    expect(within(cellOf(date)).getByText(name)).toBeInTheDocument();
  });

  it('쉬는 날(공휴일·토요일·일요일)은 날짜가 붉게, 평일은 보통 색으로 보인다', () => {
    render(<App />);
    const dateOf = (iso) => dayButtonOf(iso);
    expect(dateOf('2026-05-01')).toHaveClass('text-holiday'); // 금요일이지만 노동절
    expect(dateOf('2026-05-03')).toHaveClass('text-holiday'); // 일요일
    expect(dateOf('2026-05-04')).toHaveClass('text-foreground'); // 평일(월)
    expect(dateOf('2026-05-02')).toHaveClass('text-holiday'); // 토요일
    expect(dateOf('2026-05-01')).not.toHaveClass('text-foreground');
    // 쉬는 날은 칸 바탕도 연한 빨강, 평일은 흰색
    expect(cellOf('2026-05-01')).toHaveClass('bg-holiday-surface'); // 노동절
    expect(cellOf('2026-05-02')).toHaveClass('bg-holiday-surface'); // 토요일
    expect(cellOf('2026-05-03')).toHaveClass('bg-holiday-surface'); // 일요일
    expect(cellOf('2026-05-04')).toHaveClass('bg-card');
    expect(cellOf('2026-05-04')).not.toHaveClass('bg-holiday-surface');
  });

  it('새로 들어온 공휴일(노동절, 제헌절, 대체공휴일)도 칸에서 붉은 이름으로 보인다', () => {
    render(<App />);
    for (const [date, name] of [['2026-05-01', '노동절'], ['2026-07-17', '제헌절'], ['2026-10-05', '대체공휴일(개천절)']]) {
      expect(within(cellOf(date)).getByText(name)).toHaveClass('text-holiday');
    }
  });

  it('공휴일 이름은 칸이 좁아 잘려도, 마우스를 올리면 전체 이름이 툴팁(title)으로 나온다', () => {
    render(<App />);
    const name = within(cellOf('2026-06-03')).getByText('전국동시지방선거');
    expect(name).toHaveAttribute('title', '전국동시지방선거');
    expect(name).toHaveClass('truncate'); // 좁으면 말줄임표로 줄인다
    const long = within(cellOf('2026-10-05')).getByText('대체공휴일(개천절)');
    expect(long).toHaveAttribute('title', '대체공휴일(개천절)');
  });

  it('깨진 저장 데이터가 있어도 앱이 멈추지 않고 일정 없이 시작한다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('planner_events', '{"broken": [');
    localStorage.setItem('planner_daily', 'not json');
    render(<App />);
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('모양이 엉뚱한 저장 데이터(올바른 JSON이지만 목록이 아님)여도 앱이 멈추지 않는다', () => {
    localStorage.setItem('planner_events', '{"a":1}');
    localStorage.setItem('planner_daily', '[1,2]');
    render(<App />);
    expect(screen.getByText('2026')).toBeInTheDocument();
  });
});

describe('머리말: 연도와 보기 방식', () => {
  it('연도를 바꾸면 그 해와 다음 해의 달력이 보인다', async () => {
    const user = setup();
    await pickYear(user, '2027년');

    expect(screen.getByText('2027')).toBeInTheDocument();
    expect(screen.getByText('2028')).toBeInTheDocument();
    expect(screen.queryByText('2026')).not.toBeInTheDocument();
  });

  it('공휴일 데이터가 없는 해를 골라도 달력은 정상으로 보이고 공휴일 이름만 없다', async () => {
    const holidayNames = Object.values(KR_HOLIDAYS[2026]);
    const user = setup();
    await pickYear(user, '2029년');

    expect(screen.getByText('2029')).toBeInTheDocument();
    expect(screen.getAllByTitle('상세 일정 관리').length).toBeGreaterThan(700);
    for (const name of holidayNames) {
      expect(screen.queryAllByText(name)).toHaveLength(0);
    }
  });

  it('"화면 맞춤"을 누르면 보기 방식이 바뀌고, "가로 스크롤"을 누르면 돌아온다', async () => {
    const user = setup();
    const tab = (name) => screen.getByRole('tab', { name });
    expect(tab('가로 스크롤')).toHaveAttribute('data-active'); // 처음에는 가로 스크롤이 선택된 모양 (shadcn Tabs는 data-active일 때 흰 바탕)

    await user.click(screen.getByText('화면 맞춤'));
    expect(tab('화면 맞춤')).toHaveAttribute('data-active');
    expect(tab('가로 스크롤')).not.toHaveAttribute('data-active');
    expect(screen.getByText('2026')).toBeInTheDocument(); // 화면 맞춤에서도 연도 구분선에 연도 숫자가 보인다
    // 화면 맞춤에서는 날짜 칸이 고정 너비가 아니라 격자를 채워서, 줄의 오른쪽 끝이 월 이름 줄과 맞는다
    const wrapRow = cellOf('2026-01-01').parentElement;
    expect(wrapRow).toHaveClass('grid', 'grid-cols-[repeat(auto-fill,minmax(120px,1fr))]');
    expect(within(wrapRow).getByText('1월')).toHaveClass('col-span-full');
    expect(cellOf('2026-01-01')).not.toHaveClass('w-[120px]');
    expect(screen.getAllByTitle('상세 일정 관리')).toHaveLength(730); // 날짜 칸은 그대로

    await user.click(screen.getByText('가로 스크롤'));
    expect(tab('가로 스크롤')).toHaveAttribute('data-active');
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('연도 버튼은 입력칸 상자가 아니라 제목처럼 보이고(24px 반굵게, 파랑 글자) 좌우 여백이 같다(12px), 앱 이름은 그 밑의 작은 부제목이다', () => {
    render(<App />);
    expect(yearSelect()).toHaveClass('text-2xl', 'font-semibold', 'px-3', 'text-primary');
    expect(yearSelect()).not.toHaveClass('border', 'pl-[34px]');
    expect(yearSelect()).toHaveAccessibleName('연도 선택 (지금 2026년)');
    // 부제목은 연도 버튼과 같은 너비의 묶음 안에 있고, ⌄ 자리만큼 오른쪽 여백을 더 둬서 글자 가운데가 "2026년" 글자 가운데와 맞는다
    const subtitle = screen.getByText('연간 플래너');
    expect(subtitle.parentElement).toBe(yearSelect().parentElement);
    expect(subtitle.parentElement).toHaveClass('inline-flex', 'flex-col');
    expect(subtitle).toHaveClass('pl-3', 'pr-[34px]', 'text-center', 'text-xs', 'text-muted-foreground'); // 흰 캡슐 위에서 흐린 글자는 대비 6.17
    expect(yearSelect().compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 연도가 먼저, 부제목이 뒤
  });

  it('상단 바: ‹ 연도 › 오늘 이 흰 캡슐 하나에 있고, 보기 방식 탭과 "새 일정" 버튼은 같은 줄 오른쪽 끝에 있다', () => {
    render(<App />);
    const capsule = screen.getByTestId('period-capsule');
    expect(capsule).toHaveClass('bg-card', 'rounded-full');
    for (const name of ['지난해', '다음 해', '오늘']) expect(within(capsule).getByRole('button', { name })).toBeInTheDocument();
    expect(within(capsule).getByRole('button', { name: /^연도 선택/ })).toBeInTheDocument();
    const row = capsule.closest('header').parentElement;
    expect(row).toHaveClass('flex');
    // 오른쪽 끝 묶음(ml-auto): 보기 방식 탭 + "새 일정" 버튼
    const right = within(row).getByRole('tablist', { name: '보기 방식' }).closest('.ml-auto');
    expect(right).toBeInTheDocument();
    expect(within(right).getByRole('button', { name: '새 일정' })).toBeInTheDocument();
  });

  it('‹ ›로 한 해씩 넘기고, 고를 수 있는 연도(올해 −1 ~ +3년)의 끝에서는 눌리지 않는다', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: '다음 해' }));
    expect(yearSelect()).toHaveTextContent('2027년');
    expect(screen.getByText('2028')).toBeInTheDocument(); // 그 해와 다음 해의 달력
    await user.click(screen.getByRole('button', { name: '지난해' }));
    await user.click(screen.getByRole('button', { name: '지난해' }));
    expect(yearSelect()).toHaveTextContent('2025년');
    expect(screen.getByRole('button', { name: '지난해' })).toBeDisabled(); // 목록의 첫 해
    await pickYear(user, '2029년');
    expect(screen.getByRole('button', { name: '다음 해' })).toBeDisabled(); // 목록의 마지막 해
    expect(screen.getByRole('button', { name: '지난해' })).toBeEnabled();
  });

  it('"오늘"을 누르면 올해로 돌아가 오늘 칸을 누른 것처럼 오늘의 일정 패널이 열리고(칸에 테두리), 그 칸이 보이게 스크롤한다', async () => {
    const scrolled = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () { scrolled.push(this.dataset.date); };
    try {
      const user = setup();
      await pickYear(user, '2028년');
      await user.click(screen.getByRole('button', { name: '오늘' }));
      expect(yearSelect()).toHaveTextContent('2026년');
      expect(within(dayPanel()).getByRole('heading', { name: '2026년 6월 15일 (월)' })).toBeInTheDocument(); // 시험 속 오늘
      expect(cellOf('2026-06-15')).toHaveAttribute('aria-current', 'date');
      expect(cellOf('2026-06-15')).toHaveClass('ring-2', 'ring-primary');
      await waitFor(() => expect(scrolled).toEqual(['2026-06-15']));
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('색 단계: 상단 바 캡슐 흰색, 캘린더 섹션·연도 구분선 2단계, 월 이름 칸·날짜 칸 흰색', () => {
    render(<App />);
    expect(screen.getByTestId('period-capsule')).toHaveClass('bg-card');
    const cell = cellOf('2026-01-05');
    expect(cell).toHaveClass('bg-card');
    const monthLabel = cell.parentElement.firstElementChild.firstElementChild;
    expect(monthLabel).toHaveTextContent('1월');
    // 월 이름 칸은 흰 바탕 + 파랑 글자 (리디자인 기획서의 월 이름표)
    expect(monthLabel).toHaveClass('bg-card', 'text-primary');
    expect(monthLabel.parentElement).toHaveClass('bg-surface-blue-2'); // 옆 틈을 가리는 바깥 상자는 섹션과 같은 색
    // 연도 구분선은 캘린더 섹션과 같은 2단계라 섹션과 하나로 이어져 보이고, 섹션 안쪽 여백 없이 좌우 끝까지 붙는다.
    // 맨 위 줄만 위쪽에도 붙어 위 모서리가 섹션과 같다(15px). 중간 해(2027)는 모서리 없는 띠다
    const divider2026 = screen.getByText('2026').parentElement;
    const divider2027 = screen.getByText('2027').parentElement;
    expect(divider2026).toHaveClass('bg-surface-blue-2', '-mt-1', 'rounded-t-lg');
    expect(divider2027).toHaveClass('bg-surface-blue-2');
    expect(divider2026).not.toHaveClass('-mx-1'); // 섹션에 좌우 안쪽 여백이 없어서 늘릴 필요가 없다
    expect(divider2027).not.toHaveClass('-mt-1', 'rounded-t-lg', 'rounded-sm');
    expect(screen.getByText('2026')).toHaveClass('text-foreground'); // 연도 글자는 기본 글자색 (밝은 바탕 위에서도 잘 보이게)
    // 연도 글자 칸은 월 이름 칸과 같은 자리에 선다 (섹션 왼쪽 끝부터 64px, 가운데 맞춤)
    expect(screen.getByText('2026')).toHaveClass('w-[calc(4rem+0.25rem)]', 'pr-1', 'justify-center');
    expect(cell.closest('[data-testid="calendar-scroll"]')).toHaveClass('bg-surface-blue-2');
    // 날짜 칸 테두리는 섹션 바탕과 같은 파랑 2단계라 보이지 않고,
    // 마우스를 올리면 끌어서 고른 칸과 같은 모양(2단계 바탕 + 파랑 테두리)이 된다. 바탕만 바꾸면 섹션에 묻혀서 테두리를 함께 쓴다
    expect(cell).toHaveClass('border', 'border-surface-blue-2', 'hover:bg-selection', 'hover:border-primary');
    expect(cell).not.toHaveClass('border-border', 'hover:bg-muted');
    // 없는 날(2월 30일 등) 자리는 칠하지 않고 3단계 점선 테두리만
    expect(screen.getAllByTestId('empty-day')[0]).toHaveClass('border-dashed', 'border-surface-blue-3');
    expect(screen.getAllByTestId('empty-day')[0].className).not.toMatch(/\bbg-/);
    // 달력 상자는 남은 높이를 채우고 안에서 스크롤한다 (페이지는 스크롤되지 않아 상자의 둥근 모서리가 늘 보인다)
    expect(cell.closest('[data-testid="calendar-scroll"]')).toHaveClass('flex-1', 'min-h-0', 'rounded-lg', 'overflow-auto');
    expect(cell.closest('main').parentElement.parentElement).toHaveClass('h-screen', 'overflow-hidden'); // 화면 전체 > [상단 바, 아래 한 줄 > main]
    // 달력 상자 안쪽은 위만 4px, 좌우·아래는 0 (칸이 상자 양 끝과 바닥에 붙는다)
    expect(cell.closest('[data-testid="calendar-scroll"]').firstElementChild).toHaveClass('pt-1');
    expect(cell.closest('[data-testid="calendar-scroll"]').firstElementChild).not.toHaveClass('p-1', 'py-1', 'pb-1');
  });

  it('보기 방식 탭 묶음은 헤더 카드와 같은 2단계이고, 선택된 탭은 흰색(카드색)이라 더 밝다 — 화면 바탕(진한 파랑)을 쓰지 않는다', () => {
    render(<App />);
    expect(screen.getByRole('tablist', { name: '보기 방식' })).toHaveClass('bg-surface-blue-2');
    const active = screen.getByRole('tab', { name: '가로 스크롤' });
    expect(active.className).toContain('data-active:bg-card');
    expect(active.className).not.toContain('data-active:bg-background');
  });

  it('연도 버튼을 누르면 연도가 세로 탭으로 나오고 지금 연도가 선택돼 있으며, 고르면 닫힌다', async () => {
    const user = setup();
    await openYear(user);
    expect(screen.getByRole('tablist', { name: '연도' })).toHaveAttribute('aria-orientation', 'vertical');
    expect(screen.getByRole('tab', { name: '2026년' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: '2028년' }));
    await waitFor(() => expect(yearTabs()).toHaveLength(0));
    expect(yearSelect()).toHaveTextContent('2028년');
  });

  it('지금 연도를 다시 눌러도 상자가 닫히고 연도는 그대로다', async () => {
    const user = setup();
    await openYear(user);
    await user.click(screen.getByRole('tab', { name: '2026년' }));
    await waitFor(() => expect(yearTabs()).toHaveLength(0));
    expect(yearSelect()).toHaveTextContent('2026년');
  });

  it('키보드로도 고를 수 있다 (↓로 옮겨 Enter)', async () => {
    const user = setup();
    await openYear(user);
    await waitFor(() => expect(screen.getByRole('tab', { name: '2026년' })).toHaveFocus());
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(yearTabs()).toHaveLength(0));
    expect(yearSelect()).toHaveTextContent('2027년');
  });

  it('연도 목록은 버튼 아래로 펼쳐진다 (맨 위 머리말이라 위로 펼치면 잘린다)', async () => {
    const user = setup();
    await openYear(user);
    expect(document.querySelector('[data-slot="popover-content"]')).toHaveAttribute('data-side', 'bottom');
  });

  it('화면 맞춤 상태에서 연도를 바꿔도 보기 방식이 유지된다', async () => {
    const user = setup();
    await user.click(screen.getByText('화면 맞춤'));
    await pickYear(user, '2027년');

    expect(yearSelect()).toHaveTextContent('2027년');
    expect(screen.getByRole('tab', { name: '화면 맞춤' })).toHaveAttribute('data-active');
    expect(screen.getByText('2027')).toBeInTheDocument(); // 바꾼 해의 달력이 화면 맞춤으로 보인다
    expect(screen.queryByText('2026')).not.toBeInTheDocument();
  });
});

describe('일정 막대·카드의 색 (연한 바탕 + 같은 계열 짙은 글자)', () => {
  it('달력 막대는 일정 색을 연하게 한 바탕에 같은 계열 짙은 글자다 (예전의 어두운 색도 같은 방식)', () => {
    seedEvents([
      makeEvent(1, '파스텔 일정', '2026-01-05', '2026-01-05', COLOR.blue),
      makeEvent(2, '어두운 일정', '2026-01-06', '2026-01-06', '#1D4ED8'),
    ]);
    render(<App />);
    const bar = (date, title) => within(cellOf(date)).getByText(title).parentElement;
    for (const [date, title, color] of [['2026-01-05', '파스텔 일정', COLOR.blue], ['2026-01-06', '어두운 일정', '#1D4ED8']]) {
      const { background, text } = eventColors(color);
      expect(bar(date, title)).toHaveStyle({ backgroundColor: hexToRgb(background), color: hexToRgb(text) });
      expect(bar(date, title)).toHaveClass('rounded-[5px]');
      expect(bar(date, title).querySelector('[data-stripe]')).toBeNull(); // 왼쪽 진한 띠는 없다
    }
    expect(bar('2026-01-05', '파스텔 일정')).toHaveStyle({ backgroundColor: 'rgb(223, 230, 254)' }); // #DFE6FE
  });

  it('패널의 "일정" 목록(기간·종일·시간 일정)과 시간표 카드도 같은 색 규칙이다', async () => {
    seedEvents([makeEvent(1, '워크숍', '2026-01-05', '2026-01-05', COLOR.amber)]);
    seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.mint }] });
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    const box = dayPanel();
    const amber = eventColors(COLOR.amber);
    const listItem = within(box).getByText('워크숍').closest('button');
    expect(listItem).toHaveStyle({ backgroundColor: hexToRgb(amber.background), color: hexToRgb(amber.text) });
    expect(within(box).getByRole('button', { name: /^회의 09:00/ })).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.mint).background) });
    await user.click(within(box).getByRole('tab', { name: '시간표' }));
    const card = within(dayPanel()).getByRole('button', { name: /^09:00–10:00 회의/ });
    expect(card).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.mint).background) });
  });
});



describe('날짜 칸의 할 일 알약 (시험 속 오늘은 2026-06-15)', () => {
  const block = (id, todos) => ({ id, start: '09:00', end: '10:00', content: '공부', color: COLOR.blue, is_important: false, todos });
  const todo = (id, done) => ({ id, text: `할 일 ${id}`, done });
  const pill = (date) => within(cellOf(date)).queryByTestId('todo-pill');

  it('오늘은 파랑 채움 "할 일 완료/전체", 앞으로의 날은 흰 바탕 "할 일 n", 지난 날에 남으면 "! n개 남음", 다 끝내면 "✓ 할 일 끝"', () => {
    localStorage.setItem('planner_time_blocks', JSON.stringify({
      '2026-06-15': [block('a', [todo(1, true), todo(2, false)])],
      '2026-06-20': [block('b', [todo(3, false), todo(4, false)])],
      '2026-06-10': [block('c', [todo(5, true), todo(6, false)])],
      '2026-06-12': [block('d', [todo(7, true)])],
      '2026-06-13': [block('e', [])],
    }));
    render(<App />);
    expect(pill('2026-06-15')).toHaveTextContent('할 일 1/2');
    expect(pill('2026-06-15')).toHaveClass('bg-primary', 'text-primary-foreground', 'rounded-full');
    expect(pill('2026-06-20')).toHaveTextContent('할 일 2');
    expect(pill('2026-06-20')).toHaveClass('bg-card', 'text-primary');
    expect(pill('2026-06-10')).toHaveTextContent('! 1개 남음');
    expect(pill('2026-06-10')).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.amber).background), color: hexToRgb(eventColors(COLOR.amber).text) });
    expect(pill('2026-06-12')).toHaveTextContent('✓ 할 일 끝');
    expect(pill('2026-06-12')).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.mint).background) });
    expect(pill('2026-06-13')).toBeNull(); // 할 일이 없으면 알약도 없다
  });

  it('기간 일정의 할 일도 그 기간의 날마다 함께 센다', () => {
    seedEvents([{ ...makeEvent(1, '여행 준비', '2026-06-19', '2026-06-21'), todos: [todo(1, false)] }]);
    render(<App />);
    for (const date of ['2026-06-19', '2026-06-20', '2026-06-21']) expect(pill(date)).toHaveTextContent('할 일 1');
    expect(pill('2026-06-22')).toBeNull();
  });

  it('알약이 있는 날은 일정을 2개까지만 보이고 나머지는 "+N 더보기"로 넘긴다', () => {
    seedEvents([
      { ...makeEvent(1, '하나', '2026-06-20'), todos: [todo(1, false)] },
      makeEvent(2, '둘', '2026-06-20'),
      makeEvent(3, '셋', '2026-06-20'),
    ]);
    render(<App />);
    expect(within(cellOf('2026-06-20')).getByText('+1 더보기')).toBeInTheDocument();
    expect(within(cellOf('2026-06-20')).queryByText('셋')).toBeNull();
  });
});

describe('상단 바의 연·월·주 탭과 요약 줄 (시험 속 오늘은 2026-06-15)', () => {
  it('[연 | 월 | 주] 탭이 있고 처음에는 연이 골라져 있다. 셋 다 누를 수 있고, 점 색은 보기 색이다', () => {
    render(<App />);
    const tabs = screen.getByRole('tablist', { name: '보기' });
    expect(within(tabs).getByRole('tab', { name: '연' })).toHaveAttribute('aria-selected', 'true');
    for (const name of ['월', '주']) expect(within(tabs).getByRole('tab', { name })).not.toHaveAttribute('aria-disabled', 'true');
    const dots = within(tabs).getAllByRole('tab').map((tab) => tab.querySelector('[aria-hidden="true"]').className);
    expect(dots[0]).toContain('bg-surface-blue-5');
    expect(dots[1]).toContain('bg-surface-amber-5');
    expect(dots[2]).toContain('bg-surface-mint-5');
  });

  it('요약 줄: 올해 할 일 진행, 7일간 주요 일정, 못 끝낸 일을 저장된 일정으로 보여 준다', () => {
    seedEvents([{ ...makeEvent(1, '여행 준비', '2026-06-01', '2026-06-03'), todos: [{ id: 'a', text: '짐', done: false }, { id: 'b', text: '표', done: true }] }]);
    localStorage.setItem('planner_time_blocks', JSON.stringify({
      '2026-06-17': [{ id: 'x', start: '10:00', end: '11:00', content: '발표', color: COLOR.blue, is_important: true }],
    }));
    render(<App />);
    const summary = screen.getByRole('region', { name: '요약' });
    expect(within(summary).getByText('올해 할 일').parentElement).toHaveTextContent('1 / 2');
    expect(within(summary).getByText('7일간 주요 일정').parentElement).toHaveTextContent('1');
    expect(within(summary).getByText('6/17 · 발표')).toBeInTheDocument();
    expect(within(summary).getByText('못 끝낸 일').parentElement).toHaveTextContent('1');
    expect(within(summary).getByText('못 끝낸 일').parentElement).not.toHaveClass('border-l-[6px]', 'border-warning'); // 세 카드 모두 같은 흰 카드 (띠 없음)
  });

  it('다른 해를 고르면 범위 이름이 "2027년"으로 바뀐다', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: '다음 해' }));
    expect(within(screen.getByRole('region', { name: '요약' })).getByText('2027년 할 일')).toBeInTheDocument();
  });
});

describe('월 보기 (앰버, 시험 속 오늘은 2026-06-15)', () => {
  const openMonth = async () => {
    const user = setup();
    await user.click(screen.getByRole('tab', { name: '월' }));
    return user;
  };
  const grid = () => screen.getByTestId('month-grid');

  it('[월]을 누르면 이번 달(2026년 6월)이 일요일부터 7칸으로 보이고, 앞뒤 빈칸은 점선이다', async () => {
    await openMonth();
    expect(screen.getByRole('button', { name: /^연도 선택/ })).toHaveTextContent('2026년 6월');
    // 2026-06-01은 월요일 → 앞 빈칸 1개, 30일 → 1 + 30 = 31 → 5주(35칸) → 뒤 빈칸 4개
    expect(within(grid()).getAllByTitle('상세 일정 관리')).toHaveLength(30);
    expect(within(grid()).getAllByTestId('month-blank')).toHaveLength(5);
    expect(within(grid()).getAllByTestId('month-blank')[0]).toHaveClass('border-dashed', 'border-surface-amber-3');
    expect(grid().children[1]).toHaveAttribute('data-date', '2026-06-01'); // 둘째 칸(월요일)이 1일
    expect(screen.queryByRole('tablist', { name: '보기 방식' })).toBeNull(); // 가로 스크롤/화면 맞춤은 연 보기에만
  });

  it('보기 색이 앰버다: 화면 바탕 5단계, 달력 영역 2단계, ‹ ›·오늘 버튼 2단계, 칸 테두리 2단계', async () => {
    await openMonth();
    expect(screen.getByTestId('calendar-scroll')).toHaveClass('bg-surface-amber-2');
    expect(screen.getByTestId('calendar-scroll').closest('.h-screen')).toHaveClass('bg-surface-amber-5');
    expect(screen.getByRole('button', { name: '지난달' })).toHaveClass('bg-surface-amber-2');
    expect(screen.getByRole('button', { name: '오늘' })).toHaveClass('bg-surface-amber-2');
    expect(cellOf('2026-06-02')).toHaveClass('border-surface-amber-2');
  });

  it('‹ ›는 한 달씩 넘기고, 해가 바뀌는 곳도 넘어간다. 요약 줄 이름은 "이달" → "7월"', async () => {
    const user = await openMonth();
    expect(within(screen.getByRole('region', { name: '요약' })).getByText('이달 할 일')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('button', { name: /^연도 선택/ })).toHaveTextContent('2026년 7월');
    expect(within(screen.getByRole('region', { name: '요약' })).getByText('7월 할 일')).toBeInTheDocument();
    for (let i = 0; i < 6; i += 1) await user.click(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('button', { name: /^연도 선택/ })).toHaveTextContent('2027년 1월');
  });

  it('날짜 칸은 연 보기와 같다: 일정 막대가 보이고, 누르면 그날 패널이 열린다', async () => {
    seedEvents([makeEvent(1, '여름 휴가', '2026-06-10', '2026-06-12', COLOR.mint)]);
    const user = await openMonth();
    expect(within(cellOf('2026-06-11')).getByText('여름 휴가')).toBeInTheDocument();
    await user.click(dayButtonOf('2026-06-11'));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 6월 11일 (목)' })).toBeInTheDocument();
  });

  it('"오늘"을 누르면 다른 달에 있다가도 이번 달로 돌아와 오늘 패널을 연다', async () => {
    const user = await openMonth();
    await user.click(screen.getByRole('button', { name: '다음 달' }));
    await user.click(screen.getByRole('button', { name: '오늘' }));
    expect(screen.getByRole('button', { name: /^연도 선택/ })).toHaveTextContent('2026년 6월');
    expect(cellOf('2026-06-15')).toHaveAttribute('aria-current', 'date');
  });

  it('[연]으로 돌아가면 파랑 연 보기와 보기 방식 탭이 다시 보인다', async () => {
    const user = await openMonth();
    await user.click(screen.getByRole('tab', { name: '연' }));
    expect(screen.getByTestId('calendar-scroll')).toHaveClass('bg-surface-blue-2');
    expect(screen.getByRole('tablist', { name: '보기 방식' })).toBeInTheDocument();
  });
});

describe('주 보기 (보드형·민트, 시험 속 오늘은 2026-06-15 월요일)', () => {
  const openWeek = async () => {
    const user = setup();
    await user.click(screen.getByRole('tab', { name: '주' }));
    return user;
  };
  const title = () => screen.getByRole('button', { name: /^연도 선택/ });
  const column = (date) => screen.getByTestId(`week-column-${date}`);

  it('[주]를 누르면 이번 주(일요일 6/14 ~ 토요일 6/20)가 요일마다 한 칸인 보드로 보인다. 시간표는 없다', async () => {
    await openWeek();
    expect(title()).toHaveTextContent('2026년 6월 14–20일');
    expect(within(screen.getByTestId('week-board')).getAllByRole('region')).toHaveLength(7);
    expect(column('2026-06-14')).toHaveClass('bg-holiday-surface'); // 일요일은 쉬는 날 칸
    expect(column('2026-06-16')).toHaveClass('bg-card');
    expect(within(column('2026-06-15')).getByText('15')).toHaveClass('bg-primary', 'rounded-full'); // 오늘은 날짜에 파랑 동그라미
    expect(screen.queryByTestId('week-grid')).toBeNull();
    expect(within(screen.getByRole('region', { name: '요약' })).getByText('이번 주 할 일')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: '보기 방식' })).toBeNull();
  });

  it('보기 색이 민트다: 화면 바탕 5단계, 달력 영역 2단계, ‹ ›·오늘 버튼 2단계', async () => {
    await openWeek();
    expect(screen.getByTestId('calendar-scroll')).toHaveClass('bg-surface-mint-2');
    expect(screen.getByTestId('calendar-scroll').closest('.h-screen')).toHaveClass('bg-surface-mint-5');
    expect(screen.getByRole('button', { name: '지난주' })).toHaveClass('bg-surface-mint-2');
  });

  it('칸마다 기간·종일 막대가 먼저, 그다음 시간 일정 카드가 시작 시각 순서로 쌓이고, 머리에 할 일 알약이 붙는다', async () => {
    seedEvents([{ ...makeEvent(1, '워크숍', '2026-06-16', '2026-06-17'), todos: [{ id: 't', text: '자료', done: false }] }]);
    localStorage.setItem('planner_time_blocks', JSON.stringify({
      '2026-06-16': [
        { id: 'b', start: '14:00', end: '15:00', content: '미팅', color: COLOR.mint, is_important: false },
        { id: 'a', start: '09:00', end: '10:30', content: '회의', color: COLOR.blue, is_important: true },
      ],
    }));
    await openWeek();
    const list = within(column('2026-06-16')).getByRole('list');
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(['워크숍', '회의09:00–10:30', '미팅14:00–15:00']);
    expect(within(column('2026-06-16')).getByTestId('todo-pill')).toHaveTextContent('할 일 1');
    expect(within(column('2026-06-17')).getByText('워크숍')).toBeInTheDocument(); // 기간 일정은 그 기간의 칸마다
  });

  it('카드를 누르면 그날 패널과 카드 상세가, 막대를 누르면 기간 일정 상세가, 머리를 누르면 그날 패널이 열린다 (열린 날 칸에 테두리)', async () => {
    seedEvents([makeEvent(1, '워크숍', '2026-06-16')]);
    localStorage.setItem('planner_time_blocks', JSON.stringify({
      '2026-06-16': [{ id: 'a', start: '09:00', end: '10:00', content: '회의', color: COLOR.blue, is_important: false }],
    }));
    const user = await openWeek();
    await user.click(within(column('2026-06-16')).getByRole('button', { name: '2026-06-16 09:00–10:00 회의' }));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 6월 16일 (화)' })).toBeInTheDocument();
    expect(blockPanel()).toBeInTheDocument();
    expect(column('2026-06-16')).toHaveClass('ring-2', 'ring-primary');

    await user.click(within(column('2026-06-16')).getByRole('button', { name: '워크숍' }));
    expect(eventPanel()).toBeInTheDocument();

    await user.click(within(column('2026-06-18')).getByRole('button', { name: '2026-06-18 상세 일정 관리' }));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 6월 18일 (목)' })).toBeInTheDocument();
  });

  it('"+ 일정 더하기"를 누르면 그날 패널과 새 일정 패널(시간 일정, 다음 빈 1시간)이 열린다. 저장해야 생긴다', async () => {
    const user = await openWeek();
    await user.click(within(column('2026-06-18')).getByRole('button', { name: '2026-06-18 일정 더하기' }));
    expect(within(newPanel()).getByText('6/18 · 09:00–10:00')).toBeInTheDocument();
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 6월 18일 (목)' })).toBeInTheDocument();
    await user.type(within(newPanel()).getByRole('textbox', { name: '이름' }), '산책{Enter}');
    expect(within(column('2026-06-18')).getByRole('button', { name: '2026-06-18 09:00–10:00 산책' })).toBeInTheDocument();
  });

  it('‹ ›는 한 주씩 넘기고 달이 바뀌는 주는 이름에 두 달이 나온다. "오늘"은 이번 주로 돌아온다', async () => {
    const user = await openWeek();
    for (let i = 0; i < 2; i += 1) await user.click(screen.getByRole('button', { name: '다음 주' }));
    expect(title()).toHaveTextContent('2026년 6월 28일–7월 4일');
    expect(within(screen.getByRole('region', { name: '요약' })).getByText('6/28–7/4 할 일')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '오늘' }));
    expect(title()).toHaveTextContent('2026년 6월 14–20일');
    expect(column('2026-06-15')).toHaveClass('ring-primary'); // 오늘 패널이 열려 테두리
  });
});
