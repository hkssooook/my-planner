import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { KR_HOLIDAYS } from './data/holidays';
import { setupTestEnvironment, COLOR, cellOf, dayButtonOf, makeEvent, seedDaily, seedEvents, setup } from './test/helpers';

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
  it('날짜 버튼 순서로 계산한 칸이 실제 날짜와 요일에 맞다', () => {
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
    expect(screen.getAllByTitle('상세 일정 관리')).toHaveLength(730); // 날짜 칸은 그대로

    await user.click(screen.getByText('가로 스크롤'));
    expect(tab('가로 스크롤')).toHaveAttribute('data-active');
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('연도 버튼은 입력칸 상자가 아니라 제목처럼 보이고(24px 반굵게) 좌우 여백이 같다(12px), 앱 이름은 그 밑의 작은 부제목이다', () => {
    render(<App />);
    expect(yearSelect()).toHaveClass('text-2xl', 'font-semibold', 'px-3');
    expect(yearSelect()).not.toHaveClass('border', 'pl-[34px]');
    expect(yearSelect()).toHaveAccessibleName('연도 선택 (지금 2026년)');
    // 부제목은 연도 버튼과 같은 너비의 묶음 안에 있고, ⌄ 자리만큼 오른쪽 여백을 더 둬서 글자 가운데가 "2026년" 글자 가운데와 맞는다
    const subtitleBox = screen.getByText('연간 플래너');
    expect(subtitleBox.parentElement).toBe(yearSelect().parentElement);
    expect(subtitleBox.parentElement).toHaveClass('inline-flex', 'flex-col');
    expect(subtitleBox).toHaveClass('pl-3', 'pr-[34px]', 'text-center');
    const subtitle = screen.getByText('연간 플래너');
    expect(subtitle).toHaveClass('text-sm', 'text-muted-foreground'); // 헤더 카드(파랑 2단계) 위에서 흐린 글자는 대비 4.61로 읽힌다
    expect(yearSelect().compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 연도가 먼저, 부제목이 뒤
  });

  it('색 단계: 헤더 카드 2단계, 캘린더 섹션·연도 구분선 4단계, 월 이름 칸 3단계, 날짜 칸 흰색', () => {
    render(<App />);
    expect(yearSelect().closest('.rounded-lg.p-6')).toHaveClass('bg-surface-blue-2');
    const cell = cellOf('2026-01-05');
    expect(cell).toHaveClass('bg-card');
    const monthLabel = cell.parentElement.firstElementChild.firstElementChild;
    expect(monthLabel).toHaveTextContent('1월');
    expect(monthLabel).toHaveClass('bg-surface-blue-3');
    // 연도 구분선은 캘린더 섹션과 같은 4단계라 섹션과 하나로 이어져 보이고, 섹션 안쪽 여백 없이 좌우 끝까지 붙는다.
    // 맨 위 줄만 위쪽에도 붙어 위 모서리가 섹션과 같다(15px). 중간 해(2027)는 모서리 없는 띠다
    const divider2026 = screen.getByText('2026').parentElement;
    const divider2027 = screen.getByText('2027').parentElement;
    expect(divider2026).toHaveClass('bg-surface-blue-4', '-mx-1', '-mt-1', 'rounded-t-lg');
    expect(divider2027).toHaveClass('bg-surface-blue-4', '-mx-1');
    expect(divider2027).not.toHaveClass('-mt-1', 'rounded-t-lg', 'rounded-sm');
    expect(screen.getByText('2026')).toHaveClass('text-surface-blue-2'); // 연도 글자는 파랑 2단계
    // 연도 글자 칸은 월 이름 칸과 같은 자리에 선다 (섹션 끝에서 4px 안쪽부터 64px, 가운데 맞춤)
    expect(screen.getByText('2026')).toHaveClass('w-[calc(4rem+0.25rem)]', 'pl-1', 'justify-center');
    expect(cell.closest('.overflow-x-auto')).toHaveClass('bg-surface-blue-4');
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

describe('일정 막대의 글자색', () => {
  it('파스텔 일정 색에는 진한 글자, 아주 어두운(예전에 만든) 색에는 흰 글자가 올라간다', () => {
    seedEvents([
      makeEvent(1, '파스텔 일정', '2026-01-05', '2026-01-05', COLOR.pink),
      makeEvent(2, '어두운 일정', '2026-01-06', '2026-01-06', '#1D4ED8'),
    ]);
    render(<App />);
    const bar = (date, title) => within(cellOf(date)).getByText(title).parentElement;
    expect(bar('2026-01-05', '파스텔 일정')).toHaveStyle({ color: 'rgb(33, 36, 46)' }); // #21242E
    expect(bar('2026-01-06', '어두운 일정')).toHaveStyle({ color: 'rgb(255, 255, 255)' });
  });
});

