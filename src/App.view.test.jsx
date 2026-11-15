import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App';
import { KR_HOLIDAYS } from './data/holidays';
import { setupTestEnvironment, COLOR, cellOf, dayButtonOf, makeEvent, seedDaily, seedEvents, setup } from './test/helpers';

// 앱의 첫 화면과 머리말(연도 선택, 보기 방식)을 확인하는 시험.
// 공통 도우미와 "오늘 = 2026-06-15" 고정은 src/test/helpers.jsx 참고.

setupTestEnvironment();

// 연도 드롭다운(shadcn Select). 닫혀 있을 때 보이는 글자는 combobox의 글자로, 선택지는 눌러서 연 뒤에 읽는다.
const yearSelect = () => screen.getByRole('combobox', { name: '연도 선택' });
// 열기는 키보드(Enter)로 한다. (마우스를 누르자마자 떼는 시험용 빠른 클릭에서는 Base UI Select가 열렸다 바로 닫혀 결과가 흔들린다)
const openYear = async (user) => {
  yearSelect().focus();
  await user.keyboard('{Enter}');
};
const yearOptions = async (user) => {
  await openYear(user);
  return screen.getAllByRole('option').map((o) => o.textContent);
};
const pickYear = async (user, label) => {
  await openYear(user);
  await user.click(screen.getByRole('option', { name: label }));
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

  it('쉬는 날(공휴일·일요일)은 날짜가 붉게, 평일과 토요일은 보통 색으로 보인다', () => {
    render(<App />);
    const dateOf = (iso) => dayButtonOf(iso);
    expect(dateOf('2026-05-01')).toHaveClass('text-holiday'); // 금요일이지만 노동절
    expect(dateOf('2026-05-03')).toHaveClass('text-holiday'); // 일요일
    expect(dateOf('2026-05-04')).toHaveClass('text-foreground'); // 평일(월)
    expect(dateOf('2026-05-02')).toHaveClass('text-foreground'); // 토요일은 붉지 않다
    expect(dateOf('2026-05-01')).not.toHaveClass('text-foreground');
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
    expect(screen.getByText('가로 스크롤')).toHaveClass('bg-card'); // 처음에는 가로 스크롤이 선택된 모양

    await user.click(screen.getByText('화면 맞춤'));
    expect(screen.getByText('화면 맞춤')).toHaveClass('bg-card');
    expect(screen.getByText('가로 스크롤')).not.toHaveClass('bg-card');
    expect(screen.getByText('2026')).toBeInTheDocument(); // 화면 맞춤에서도 연도 구분선에 연도 숫자가 보인다
    expect(screen.getAllByTitle('상세 일정 관리')).toHaveLength(730); // 날짜 칸은 그대로

    await user.click(screen.getByText('가로 스크롤'));
    expect(screen.getByText('가로 스크롤')).toHaveClass('bg-card');
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('연도 드롭다운은 입력칸 상자가 아니라 제목처럼 보인다 (테두리 없이 24px 반굵게), 앱 이름은 그 밑의 작은 부제목이다', () => {
    render(<App />);
    expect(yearSelect()).toHaveClass('text-2xl', 'font-semibold', 'border-transparent', 'data-[size=default]:h-auto');
    expect(yearSelect()).not.toHaveClass('text-sm', 'border-input', 'data-[size=default]:h-8'); // shadcn 기본 상자 모양은 덮어쓴다
    const subtitle = screen.getByText('연간 플래너');
    expect(subtitle).toHaveClass('text-sm', 'text-muted-foreground');
    expect(yearSelect().compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // 연도가 먼저, 부제목이 뒤
  });

  it('연도 드롭다운을 열면 지금 연도에 선택 표시가 있고, 고르면 닫힌다', async () => {
    const user = setup();
    await openYear(user);
    expect(screen.getByRole('option', { name: '2026년' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: '2028년' }));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(yearSelect()).toHaveTextContent('2028년');
  });

  it('연도 목록은 트리거 아래로 펼쳐진다 (shadcn 기본 "선택값을 트리거 자리에 맞춤"은 맨 위 머리말에서 선택지가 잘려서 끈다)', async () => {
    const user = setup();
    await openYear(user);
    expect(document.querySelector('[data-slot="select-content"]')).toHaveAttribute('data-align-trigger', 'false');
  });

  it('화면 맞춤 상태에서 연도를 바꿔도 보기 방식이 유지된다', async () => {
    const user = setup();
    await user.click(screen.getByText('화면 맞춤'));
    await pickYear(user, '2027년');

    expect(yearSelect()).toHaveTextContent('2027년');
    expect(screen.getByText('화면 맞춤')).toHaveClass('bg-card');
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

