import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import { setupTestEnvironment, saveChanges, COLOR, barIn, blockPanel, buttonIn, cellOf, showTimetable, newPanel, queryNewPanel, dayPanel, drag, dragCard, dragTime, eventPanel, queryBlockPanel, timeCard, timeGrid, hexToRgb, dayButtonOf, makeEvent, popupCount, queryDayPanel, seedDaily, seedEvents, setup, stored } from './test/helpers';
import { eventColors } from './utils/color';

// 새 일정을 만드는 방법(새 일정 패널 / 날짜 칸을 눌러 오른쪽 일정 패널 열기 / 시간표 끌기)을 확인하는 시험.
// 공통 도우미와 "오늘 = 2026-06-15" 고정은 src/test/helpers.jsx 참고.

setupTestEnvironment();

describe('새 일정 패널 ([시간 일정 | 종일 일정], 저장해야 생긴다)', () => {
  const kindTab = (name) => within(newPanel()).getByRole('tab', { name });

  it('날짜를 두 칸 이상 끌었다 놓으면 시작한 날의 일정 패널과 새 일정 패널(종일, 고른 기간)이 함께 열린다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 1월 5일 (월)' })).toBeInTheDocument();
    expect(kindTab('종일 일정')).toHaveAttribute('aria-selected', 'true');
    expect(within(newPanel()).getByLabelText('새 일정 시작일')).toHaveValue('2026-01-05');
    expect(within(newPanel()).getByLabelText('새 일정 종료일')).toHaveValue('2026-01-07');
    expect(within(newPanel()).getByText('1/5–1/7 · 3일')).toBeInTheDocument();
    await waitFor(() => expect(within(newPanel()).getByRole('textbox', { name: '이름' })).toHaveFocus());
    expect(popupCount()).toBe(0); // 예전 기간 일정 등록 팝업은 없다
  });

  it('거꾸로(뒤 날짜에서 앞 날짜로) 끌어도 기간이 날짜 순서로 채워진다', async () => {
    const user = setup();
    await drag(user, '2026-01-07', '2026-01-05');
    expect(within(newPanel()).getByLabelText('새 일정 시작일')).toHaveValue('2026-01-05');
    expect(within(newPanel()).getByLabelText('새 일정 종료일')).toHaveValue('2026-01-07');
  });

  it('한 칸만 눌렀다 놓으면 새 일정 패널은 열리지 않는다', async () => {
    const user = setup();
    await user.pointer([{ keys: '[MouseLeft>]', target: cellOf('2026-01-05') }, { keys: '[/MouseLeft]' }]);
    expect(queryNewPanel()).toBeNull();
  });

  it('새 일정 패널이 열려 있는 동안 끈 칸이 강조되고, 취소하면 강조가 풀리고 아무것도 생기지 않는다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    expect(cellOf('2026-01-06')).toHaveClass('bg-selection', 'border-primary'); // 섹션(2단계)에 묻히지 않게 파랑 테두리도 둔다
    expect(cellOf('2026-01-08')).not.toHaveClass('bg-selection');

    await user.type(within(newPanel()).getByRole('textbox', { name: '이름' }), '버릴 이름');
    await user.click(buttonIn(newPanel(), '취소'));
    expect(queryNewPanel()).toBeNull();
    expect(cellOf('2026-01-06')).not.toHaveClass('bg-selection');
    expect(localStorage.getItem('planner_events')).toBeNull();

    await drag(user, '2026-01-10', '2026-01-12');
    expect(within(newPanel()).getByRole('textbox', { name: '이름' })).toHaveValue(''); // 다시 열면 비어 있다
  });

  it('이름과 색을 입력해 저장하면 기간의 모든 날짜 칸에 그 색의 막대가 생기고 저장소에도 저장된다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const box = newPanel();
    await user.type(within(box).getByRole('textbox', { name: '이름' }), '여름 워크숍');
    await user.click(within(within(box).getByRole('group', { name: '새 일정 색' })).getByRole('button', { name: '핑크' }));
    await user.click(buttonIn(box, '저장'));

    expect(queryNewPanel()).toBeNull();
    for (const date of ['2026-01-05', '2026-01-06', '2026-01-07']) {
      expect(barIn(cellOf(date), '여름 워크숍')).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.pink).background) });
    }
    expect(within(cellOf('2026-01-08')).queryByText('여름 워크숍')).not.toBeInTheDocument();
    expect(stored('planner_events')).toEqual([
      expect.objectContaining({ title: '여름 워크숍', start_date: '2026-01-05', end_date: '2026-01-07', color: COLOR.pink }),
    ]);
    expect(cellOf('2026-01-06')).not.toHaveClass('bg-selection');
  });

  it('이름 칸에서 Enter로도 저장된다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-06');
    await user.type(within(newPanel()).getByRole('textbox', { name: '이름' }), '엔터 일정{Enter}');
    expect(stored('planner_events').map((e) => e.title)).toEqual(['엔터 일정']);
  });

  it('이름이 비어 있으면 저장하지 않고 패널에 알린다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    await user.click(buttonIn(newPanel(), '저장'));
    expect(within(newPanel()).getByRole('alert')).toHaveTextContent('이름을 적어 주세요.');
    expect(localStorage.getItem('planner_events')).toBeNull();
  });

  it('"+ 일정 더하기"는 시간 일정(다음 빈 1시간)으로 열리고, 저장하면 그날 시간 카드로 생긴다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(buttonIn(dayPanel(), '+ 일정 더하기'));
    expect(kindTab('시간 일정')).toHaveAttribute('aria-selected', 'true');
    expect(within(newPanel()).getByText('1/5 · 09:00–10:00')).toBeInTheDocument(); // 오늘이 아닌 날은 09:00부터 찾는다
    await user.type(within(newPanel()).getByRole('textbox', { name: '이름' }), '아침 회의');
    await user.click(within(newPanel()).getByRole('checkbox', { name: '주요 일정 (달력에 ★ 표시)' }));
    await user.click(buttonIn(newPanel(), '저장'));
    expect(stored('planner_time_blocks')['2026-01-05']).toEqual([
      expect.objectContaining({ start: '09:00', end: '10:00', content: '아침 회의', is_important: true }),
    ]);
    expect(within(dayPanel()).getByRole('button', { name: /^아침 회의 09:00/ })).toBeInTheDocument();
  });

  it('09:00에 카드가 있으면 그다음 빈 1시간으로 열리고, 겹치는 시각으로 바꿔 저장하면 알리고 저장하지 않는다', async () => {
    seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(buttonIn(dayPanel(), '+ 일정 더하기'));
    expect(within(newPanel()).getByText('1/5 · 10:00–11:00')).toBeInTheDocument(); // 09:00~10:00 회의 다음
    await user.type(within(newPanel()).getByRole('textbox', { name: '이름' }), '겹칠 일정');
    await user.selectOptions(within(newPanel()).getByRole('combobox', { name: '새 일정 시작 시각' }), '09:00');
    await user.click(buttonIn(newPanel(), '저장'));
    expect(within(newPanel()).getByRole('alert')).toHaveTextContent('이미 있는 시간 일정과 겹쳐요');
    expect(stored('planner_time_blocks')['2026-01-05']).toHaveLength(1);
  });

  it('[시간 일정 | 종일 일정]을 바꿔도 이름은 남고, "시간" 칸만 "날짜" 칸으로 바뀐다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(buttonIn(dayPanel(), '+ 일정 더하기'));
    await user.type(within(newPanel()).getByRole('textbox', { name: '이름' }), '바꿀 일정');
    await user.click(kindTab('종일 일정'));
    expect(within(newPanel()).getByRole('textbox', { name: '이름' })).toHaveValue('바꿀 일정');
    expect(within(newPanel()).queryByRole('combobox', { name: '새 일정 시작 시각' })).toBeNull();
    expect(within(newPanel()).getByLabelText('새 일정 시작일')).toHaveValue('2026-01-05');
    await user.click(buttonIn(newPanel(), '저장'));
    expect(stored('planner_events')).toEqual([expect.objectContaining({ title: '바꿀 일정', start_date: '2026-01-05', end_date: '2026-01-05' })]);
  });

  it('시간표 모드 종일 줄의 "+ 종일"은 종일 일정으로 연다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await showTimetable(user);
    await user.click(buttonIn(dayPanel(), '+ 종일'));
    expect(kindTab('종일 일정')).toHaveAttribute('aria-selected', 'true');
  });

  it('상단 바의 "새 일정"은 오늘의 일정 패널과 새 일정 패널(시간 일정)을 연다', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: '새 일정' }));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 6월 15일 (월)' })).toBeInTheDocument();
    expect(kindTab('시간 일정')).toHaveAttribute('aria-selected', 'true');
  });

  it('새 일정 패널은 두 번째 패널 자리 하나만 쓴다: 목록의 일정을 누르면 상세 패널로 바뀐다', async () => {
    seedEvents([makeEvent(1, '워크숍', '2026-01-05')]);
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(buttonIn(dayPanel(), '+ 일정 더하기'));
    await user.click(within(dayPanel()).getByRole('button', { name: /^워크숍/ }));
    expect(queryNewPanel()).toBeNull();
    expect(eventPanel()).toBeInTheDocument();
  });

  it('새 일정 패널의 취소는 secondary(파랑 2단계), 저장은 primary 버튼이다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    expect(buttonIn(newPanel(), '취소')).toHaveClass('bg-secondary', 'text-secondary-foreground');
    expect(buttonIn(newPanel(), '저장')).toHaveClass('bg-primary', 'text-primary-foreground');
  });
});

describe('일정 패널 (날짜 칸 누르기)', () => {
  const openPanel = async (user, date) => {
    await user.click(dayButtonOf(date));
    return dayPanel();
  };

  it('날짜 칸의 빈 곳을 누르면 오른쪽에 그 날짜의 일정 패널이 열린다 (팝업이 아니라 달력과 함께 보인다)', async () => {
    const user = setup();
    await user.click(cellOf('2026-01-05'));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 1월 5일 (월)' })).toBeInTheDocument();
    expect(popupCount()).toBe(0);
    expect(cellOf('2026-01-06')).toBeVisible();
  });

  it('키보드로 날짜 버튼에 가서 Enter를 누르면 패널이 열리고, 커서가 패널 제목으로 옮겨진다', async () => {
    const user = setup();
    dayButtonOf('2026-01-05').focus();
    await user.keyboard('{Enter}');
    const heading = within(dayPanel()).getByRole('heading', { name: '2026년 1월 5일 (월)' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('패널이 열린 날짜 칸에는 테두리 표시가 있고, 다른 날짜를 누르면 표시와 패널이 그 날짜로 옮겨 간다', async () => {
    const user = setup();
    await user.click(cellOf('2026-01-05'));
    expect(cellOf('2026-01-05')).toHaveAttribute('aria-current', 'date');
    await user.click(cellOf('2026-01-08'));
    expect(cellOf('2026-01-05')).not.toHaveAttribute('aria-current');
    expect(cellOf('2026-01-08')).toHaveAttribute('aria-current', 'date');
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 1월 8일 (목)' })).toBeInTheDocument();
  });

  it('‹ › 버튼으로 전날·다음 날로 넘어가고, 달·해가 바뀌어도 맞다', async () => {
    const user = setup();
    await openPanel(user, '2026-01-31');
    await user.click(buttonIn(dayPanel(), '다음 날'));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 2월 1일 (일)' })).toBeInTheDocument();
    await user.click(buttonIn(dayPanel(), '전날'));
    await user.click(buttonIn(dayPanel(), '전날'));
    expect(within(dayPanel()).getByRole('heading', { name: '2026년 1월 30일 (금)' })).toBeInTheDocument();
  });

  it('X(닫기)를 누르면 패널이 닫힌다', async () => {
    const user = setup();
    await openPanel(user, '2026-01-05');
    await user.click(buttonIn(dayPanel(), '닫기'));
    expect(queryDayPanel()).toBeNull();
    expect(cellOf('2026-01-05')).not.toHaveAttribute('aria-current');
  });

  it('칸 안의 일정 막대를 누르면 그날의 일정 패널과 그 일정의 기간 일정 상세 패널이 함께 열린다 (수정 팝업은 없다)', async () => {
    seedEvents([makeEvent(1, '여름 워크숍', '2026-01-05', '2026-01-06')]);
    const user = setup();
    await user.click(within(cellOf('2026-01-06')).getByText('여름 워크숍'));
    expect(within(dayPanel()).getByRole('heading', { level: 2 })).toHaveTextContent('2026년 1월 6일');
    expect(within(eventPanel()).getByLabelText('이름')).toHaveValue('여름 워크숍');
    expect(popupCount()).toBe(0);
  });

  describe('① 일정 구역 (기간·종일·시간 일정을 한 목록으로)', () => {
    it('그날에 걸친 기간 일정과 종일 일정이 모두 보이고, 기간 일정에는 기간과 며칠째인지가 붙는다', async () => {
      seedEvents([
        makeEvent(1, '제주 여행', '2026-01-04', '2026-01-08'),
        makeEvent(2, '팀 워크숍', '2026-01-05'),
        makeEvent(3, '다른 날 일정', '2026-01-09'),
      ]);
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(within(box).getByText('2개')).toBeInTheDocument();
      expect(barIn(box, '제주 여행')).toHaveTextContent('1/4–1/8 · 2/5일째');
      expect(barIn(box, '팀 워크숍')).toHaveTextContent('종일');
      expect(within(box).queryByText('다른 날 일정')).toBeNull();
    });

    it('시간 일정도 같은 목록에 시작 시각 순서로 보이고(기간·종일 아래), 왼쪽에 시각·할 일 진행 숫자가 붙으며, 누르면 카드 상세 패널이 열린다', async () => {
      seedEvents([makeEvent(1, '팀 워크숍', '2026-01-05')]);
      seedDaily({ '2026-01-05': [
        { hour: 14, content: '미팅', is_important: false, color: COLOR.mint },
        { hour: 9, content: '회의', is_important: true, color: COLOR.blue },
      ] });
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(within(box).getByText('3개')).toBeInTheDocument();
      const list = within(box).getByRole('list', { name: '일정 목록' });
      const rows = within(list).getAllByRole('listitem');
      expect(rows.map((r) => r.firstElementChild.textContent)).toEqual(['종일', '09:00', '14:00']);
      // 접근성 이름은 이름부터 (시간표 카드는 시각부터 읽어 둘이 구분된다)
      const row = within(list).getByRole('button', { name: '회의 09:00–10:00 (주요)' });
      await user.click(row);
      expect(blockPanel()).toBeInTheDocument();
      expect(row).toHaveAttribute('aria-pressed', 'true');
    });

    it('머리말과 "일정" 목록은 패널을 스크롤해도 위에 고정되고, 목록이 길면 목록 안에서만 스크롤된다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const pinned = within(box).getByTestId('day-panel-pinned');
      expect(pinned).toHaveClass('sticky', 'top-0');
      expect(within(pinned).getByRole('heading', { name: '2026년 1월 5일 (월)' })).toBeInTheDocument();
      // "일정" 제목 줄과 [목록 | 시간표] 스위치가 위에 고정된다. 목록·추가 칸은 그 아래에서 스크롤된다
      expect(within(pinned).getByRole('heading', { name: /^일정/ })).toBeInTheDocument();
      expect(within(pinned).getByRole('tablist', { name: '일정 보기 방식' })).toBeInTheDocument();
      expect(within(pinned).queryByRole('region', { name: '종일 일정 추가' })).toBeNull();
    });

    it('패널은 너비 320px(두 번째 패널과 같은 너비)의 둥근 카드이고, 달력 상자와 같은 줄에 서서 같은 높이에서 시작하고 끝난다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(box).toHaveClass('w-[320px]', 'h-full', 'rounded-lg', 'border');
      expect(box).not.toHaveClass('mt-6', 'sticky', 'h-[calc(100vh-36px)]'); // 패널마다 따로 위 여백·높이를 계산하지 않는다
      // 달력 상자(main)와 패널이 한 줄(flex, 사이 12px)에 나란히 있다
      const row = box.parentElement;
      expect(row).toHaveClass('flex', 'flex-1', 'min-h-0', 'gap-3');
      expect(row.querySelector('main')).toContainElement(cellOf('2026-01-05'));
      // 두 번째 패널도 같은 줄, 같은 높이
      await user.click(buttonIn(box, '+ 일정 더하기'));
      expect(newPanel().parentElement).toBe(row);
      expect(newPanel()).toHaveClass('w-[320px]', 'h-full');
    });

    it('일정이 없으면 없다는 안내와 "+ 일정 더하기"가 보이고, 예전 "종일 일정 추가" 칸은 없다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(within(box).getByText('이 날의 일정이 없어요.')).toBeInTheDocument();
      expect(buttonIn(box, '+ 일정 더하기')).toBeInTheDocument();
      expect(within(box).queryByRole('region', { name: '종일 일정 추가' })).toBeNull();
      expect(within(box).queryByRole('textbox')).toBeNull();
    });

    it('목록의 띠를 누르면 오른쪽에 기간 일정 상세 패널이 열리고, 그 띠가 눌림 상태로 보인다', async () => {
      seedEvents([makeEvent(1, '고칠 일정', '2026-01-05')]);
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      await user.click(within(box).getByRole('button', { name: /^고칠 일정/ }));
      expect(within(eventPanel()).getByLabelText('이름')).toHaveValue('고칠 일정');
      expect(within(box).getByRole('button', { name: /^고칠 일정/ })).toHaveAttribute('aria-pressed', 'true');
      expect(dayPanel()).toBeInTheDocument();
    });
  });

  describe('② 시간 일정 (30분 시간표 + 끌어서 카드 만들기)', () => {
    // 패널을 열고 일정 보기 방식을 "시간표"로 바꾼다
    const openTimetable = async (user, date) => {
      await user.click(dayButtonOf(date));
      await showTimetable(user);
      return dayPanel();
    };

    it('0~24시를 30분 칸 48개로 나눈 시간표가 있고, 정각마다 시각이 적혀 있다', async () => {
      const user = setup();
      const box = await openTimetable(user, '2026-01-05');
      expect(timeGrid()).toHaveStyle({ height: `${48 * 20}px` }); // 30분 칸 20px → 1시간 40px
      const grid = within(box).getByTestId('time-grid-scroll');
      for (const time of ['00:00', '08:00', '23:00']) expect(within(grid).getByText(time)).toBeInTheDocument();
      expect(within(grid).queryByText('08:30')).toBeNull(); // 30분 줄에는 글자 없이 점선만
      expect(within(box).queryByPlaceholderText('내용 입력')).toBeNull(); // 예전 24줄 입력칸은 없다
    });

    it('빈 칸을 끌면 30분 단위로 카드가 생기고, 오른쪽 카드 상세 패널이 열려 이름 칸에 커서가 놓인다', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(18, 20); // 09:00 칸 ~ 10:00 칸 → 09:00~10:30

      const detail = blockPanel();
      expect(within(detail).getByText(/09:00–10:30/)).toBeInTheDocument();
      await waitFor(() => expect(within(detail).getByRole('textbox', { name: '이름' })).toHaveFocus());
      expect(timeCard('09:00')).toHaveAttribute('aria-pressed', 'true');
      expect(localStorage.getItem('planner_time_blocks')).toBeNull(); // 끌기만 해서는 아직 저장되지 않는다

      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([
        expect.objectContaining({ start: '09:00', end: '10:30', content: '', is_important: false, color: COLOR.blue }),
      ]);
    });

    it('카드는 시작 시각 줄 바로 아래에서 끝 시각 줄 바로 위까지 채운다 (위·아래 모두 줄에 딱 붙음)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      // 한 칸 20px, 줄 1px: 09:00 줄은 360~361px, 10:00 줄은 400px부터 → 카드는 361px부터 39px(= 400 − 361)
      expect(timeCard('09:00')).toHaveStyle({ top: '361px', height: '39px' });
    });

    it('위로 끌어도 되고, 누르기만 하면 30분 카드가 생긴다', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(29, 27); // 14:30 칸에서 13:30 칸으로 → 13:30~15:00
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '오후');
      dragTime(40); // 20:00 칸 클릭 → 20:00~20:30
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end])).toEqual([['13:30', '15:00'], ['20:00', '20:30']]);
    });

    it('끄는 중에 기존 카드에 닿으면 그 앞에서 멈추고, 카드가 있는 칸에서는 새 카드가 시작되지 않는다 (겹침 없음)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 10, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(16, 24); // 08:00부터 12:00까지 끌었지만 10:00 회의 앞에서 멈춘다
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '준비');
      dragTime(21); // 10:30 칸은 회의(10:00~11:00) 안이라 아무 일도 없다
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end, b.content])).toEqual([
        ['08:00', '10:00', '준비'],
        ['10:00', '11:00', '회의'],
      ]);
    });

    it('카드 상세 패널에서 이름·색·주요를 바꾸고 저장을 누르면 저장소와 달력 칸에 반영되고, 시간표 카드는 바로 바뀐다 (같은 카드 id 유지)', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(18, 19);
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      const id = stored('planner_time_blocks')['2026-01-05'][0].id;
      const detail = blockPanel();
      await user.type(within(detail).getByRole('textbox', { name: '이름' }), '아침 회의');
      await user.click(within(within(detail).getByRole('group', { name: '시간 일정 색' })).getByRole('button', { name: '앰버' }));
      await user.click(within(detail).getByRole('checkbox', { name: /주요 일정/ }));

      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([
        { id, start: '09:00', end: '10:00', content: '아침 회의', color: COLOR.amber, is_important: true },
      ]);
      expect(within(dayPanel()).getByRole('button', { name: '09:00–10:00 아침 회의 (주요)' })).toBeInTheDocument();
      const cell = cellOf('2026-01-05');
      expect(within(cell).getByText('09:00')).toBeInTheDocument();
      expect(within(cell).getByText('아침 회의')).toBeInTheDocument();
    });

    it('이름 없이 카드 상세 패널을 닫으면 그 카드는 사라지고, 이름이 있으면 남는다', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(18);
      await user.click(buttonIn(blockPanel(), '시간 일정 상세 닫기'));
      expect(queryBlockPanel()).toBeNull();
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다 (빈 카드가 사라져 바뀐 것이 없으면 저장할 것도 없다)
      expect(stored('planner_time_blocks')?.['2026-01-05'] ?? []).toEqual([]);

      dragTime(20);
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '남길 일정');
      await user.keyboard('{Escape}'); // Esc로도 닫힌다
      expect(queryBlockPanel()).toBeNull();
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => b.content)).toEqual(['남길 일정']);
    });

    it('이름 없는 카드를 둔 채 다른 칸을 끌면, 앞의 빈 카드는 사라지고 새 카드가 남는다', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(18);
      dragTime(30);
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => b.start)).toEqual(['15:00']);
    });

    it('카드를 누르면 그 카드의 상세 패널이 열리고, 삭제 버튼으로 지울 수 있다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '아침 회의', is_important: true, color: COLOR.purple }] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      expect(queryBlockPanel()).toBeNull();
      await user.click(timeCard('09:00'));
      expect(within(blockPanel()).getByRole('textbox', { name: '이름' })).toHaveValue('아침 회의');
      expect(within(blockPanel()).getByRole('checkbox', { name: /주요 일정/ })).toBeChecked();

      await user.click(buttonIn(blockPanel(), '이 시간 일정 삭제'));
      expect(queryBlockPanel()).toBeNull();
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([]);
      expect(within(cellOf('2026-01-05')).queryByText('아침 회의')).toBeNull();
    });

    it('키보드로도 만들 수 있다: 시작·끝 시각을 고르고 "추가" (겹치면 안내가 나오고 만들지 않는다)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 10, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      const box = await openTimetable(user, '2026-01-05');
      const form = within(box).getByRole('form', { name: '시간 일정 추가' });
      await user.selectOptions(within(form).getByRole('combobox', { name: '시작 시각' }), '09:30');
      await user.selectOptions(within(form).getByRole('combobox', { name: '끝 시각' }), '10:30');
      await user.click(buttonIn(form, '추가'));
      expect(within(box).getByRole('alert')).toHaveTextContent('겹쳐요');
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05']).toHaveLength(1);

      await user.selectOptions(within(form).getByRole('combobox', { name: '끝 시각' }), '10:00');
      await user.click(buttonIn(form, '추가'));
      expect(within(box).queryByRole('alert')).toBeNull();
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end])).toEqual([['09:30', '10:00'], ['10:00', '11:00']]);
      expect(blockPanel()).toBeInTheDocument();
    });

    it('끝 시각은 시작 시각보다 뒤의 시각만 고를 수 있다', async () => {
      const user = setup();
      const box = await openTimetable(user, '2026-01-05');
      await user.selectOptions(within(box).getByRole('combobox', { name: '시작 시각' }), '23:30');
      const endOptions = within(within(box).getByRole('combobox', { name: '끝 시각' })).getAllByRole('option').map((o) => o.textContent);
      expect(endOptions).toEqual(['24:00']);
    });

    it('다음 날로 넘기면 카드 상세 패널이 닫히고, 날짜마다 카드가 따로 저장된다', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(18);
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '이 날 일정');
      await user.click(buttonIn(dayPanel(), '다음 날'));
      expect(queryBlockPanel()).toBeNull();
      dragTime(18);
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '다음 날 일정');

      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      const daily = stored('planner_time_blocks');
      expect(daily['2026-01-05'].map((b) => b.content)).toEqual(['이 날 일정']);
      expect(daily['2026-01-06'].map((b) => b.content)).toEqual(['다음 날 일정']);
    });

    it('일정 패널을 닫으면 카드 상세 패널도 함께 닫힌다', async () => {
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragTime(18);
      await user.click(buttonIn(dayPanel(), '닫기'));
      expect(queryDayPanel()).toBeNull();
      expect(queryBlockPanel()).toBeNull();
    });

    it('카드 가운데를 잡고 끌면 길이는 그대로 옮겨지고, 그 카드의 상세 패널이 열린다 (id 유지)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      const id = stored('planner_time_blocks')['2026-01-05'][0].id;
      dragCard('09:00', 18, 21); // 09:00 칸을 잡고 10:30 칸으로 → 3칸 아래
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([expect.objectContaining({ id, start: '10:30', end: '11:30', content: '회의' })]);
      expect(within(blockPanel()).getByText(/10:30–11:30/)).toBeInTheDocument();
      expect(within(cellOf('2026-01-05')).getByText('10:30')).toBeInTheDocument(); // 달력 칸에도 바뀐 시각
    });

    it('겹치지만 않으면 다른 카드를 넘어 옮길 수 있다 (앞선 일정을 나중 일정 뒤로)', async () => {
      seedDaily({ '2026-01-05': [
        { hour: 9, content: '회의', is_important: false, color: COLOR.blue },
        { hour: 12, content: '점심', is_important: false, color: COLOR.mint },
      ] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragCard('09:00', 18, 28); // 회의를 잡고 14:00 칸으로 → 점심을 넘어간다
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.content, b.start, b.end])).toEqual([
        ['점심', '12:00', '13:00'],
        ['회의', '14:00', '15:00'], // 저장 순서도 시작 시각 순서로 바뀐다
      ]);
      expect(within(blockPanel()).getByText(/14:00–15:00/)).toBeInTheDocument();
    });

    it('다른 카드 위에 놓으면 겹치지 않는 가장 가까운 빈자리로 간다', async () => {
      seedDaily({ '2026-01-05': [
        { hour: 9, content: '회의', is_important: false, color: COLOR.blue },
        { hour: 12, content: '점심', is_important: false, color: COLOR.mint },
      ] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragCard('09:00', 18, 25); // 회의를 12:30 칸(점심 한가운데)에 놓으면 → 점심 바로 뒤 13:00
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.content, b.start, b.end])).toEqual([
        ['점심', '12:00', '13:00'],
        ['회의', '13:00', '14:00'],
      ]);
    });

    it('아래 가장자리를 끌면 끝 시각이, 위 가장자리를 끌면 시작 시각이 30분 단위로 바뀐다 (최소 30분)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      dragCard('09:00', 19, 22, 'end'); // 끝을 11:00 칸까지 → 11:30 끝
      dragCard('09:00', 18, 16, 'start'); // 시작을 08:00 칸으로
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      const [block] = stored('planner_time_blocks')['2026-01-05'];
      expect([block.start, block.end]).toEqual(['08:00', '11:30']);
      dragCard('08:00', 22, 2, 'end'); // 끝을 시작보다 위로 끌어도 최소 30분은 남는다
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end])).toEqual([['08:00', '08:30']]);
    });

    it('카드를 누르기만 하면(칸이 안 바뀌면) 시각은 그대로이고 상세 패널만 열린다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      const before = stored('planner_time_blocks')['2026-01-05'];
      dragCard('09:00', 18, 18);
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual(before);
      expect(blockPanel()).toBeInTheDocument();
    });

    it('카드 상세 패널: 시작 시각을 고르면 길이 그대로 옮겨지고(다른 카드를 넘어가도 됨), 끝 시각을 고르면 길이가 바뀐다', async () => {
      seedDaily({ '2026-01-05': [
        { hour: 8, content: '아침', is_important: false, color: COLOR.blue },
        { hour: 10, content: '회의', is_important: false, color: COLOR.blue },
        { hour: 12, content: '점심', is_important: false, color: COLOR.mint },
      ] });
      const user = setup();
      await openTimetable(user, '2026-01-05');
      await user.click(timeCard('10:00'));
      const detail = blockPanel();
      const startBox = within(detail).getByRole('combobox', { name: '카드 시작 시각' });
      const endBox = within(detail).getByRole('combobox', { name: '카드 끝 시각' });
      const options = (box) => within(box).getAllByRole('option').map((o) => o.textContent);
      // 시작 시각: 1시간 카드가 다른 카드와 겹치지 않고 들어가는 자리만 (아침 08:00~09:00, 점심 12:00~13:00 피함)
      expect(options(startBox)).toContain('07:00');
      expect(options(startBox)).not.toContain('07:30');
      expect(options(startBox)).toContain('11:00');
      expect(options(startBox)).not.toContain('11:30');
      expect(options(startBox)).toContain('13:00');
      expect(options(startBox).at(-1)).toBe('23:00');
      // 끝 시각: 점심(12:00) 앞까지만
      expect(options(endBox)).toEqual(['10:30', '11:00', '11:30', '12:00']);

      await user.selectOptions(startBox, '15:00'); // 점심을 넘어 옮긴다
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.content, b.start, b.end])).toEqual([
        ['아침', '08:00', '09:00'],
        ['점심', '12:00', '13:00'],
        ['회의', '15:00', '16:00'],
      ]);
      await user.selectOptions(within(blockPanel()).getByRole('combobox', { name: '카드 끝 시각' }), '17:30');
      await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
      expect(stored('planner_time_blocks')['2026-01-05'].at(-1)).toEqual(expect.objectContaining({ start: '15:00', end: '17:30' }));
    });

    it('달력 칸의 시간 일정을 누르면 일정 패널과 그 카드의 상세 패널이 함께 열린다', async () => {
      seedDaily({ '2026-01-05': [
        { hour: 9, content: '아침 회의', is_important: false, color: COLOR.blue },
        { hour: 14, content: '고객사 미팅', is_important: true, color: COLOR.amber },
      ] });
      const user = setup();
      await user.click(within(cellOf('2026-01-05')).getByText('고객사 미팅'));

      expect(dayPanel()).toBeInTheDocument();
      const name = within(blockPanel()).getByRole('textbox', { name: '이름' });
      expect(name).toHaveValue('고객사 미팅');
      await waitFor(() => expect(name).toHaveFocus());
      // 패널은 목록으로 열리고, 목록에서 그 카드 줄이 눌린 상태로 보인다
      expect(within(dayPanel()).getByRole('button', { name: /^고객사 미팅 14:00/ })).toHaveAttribute('aria-pressed', 'true');
      expect(within(dayPanel()).getByRole('button', { name: /^아침 회의 09:00/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('칸의 빈 곳으로 열면 카드 상세 패널은 열리지 않는다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 14, content: '고객사 미팅', is_important: true, color: COLOR.amber }] });
      const user = setup();
      await user.click(within(cellOf('2026-01-05')).getByText('고객사 미팅'));
      await user.click(cellOf('2026-01-05'));
      expect(dayPanel()).toBeInTheDocument();
      expect(queryBlockPanel()).toBeNull();
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => b.content)).toEqual(['고객사 미팅']); // 이름 있는 카드는 그대로
    });
  });
});

describe('카드 상세 패널의 할 일', () => {
  // 09:00 회의 카드 하나를 미리 넣고(화면을 그리기 전에), 그 카드의 상세 패널을 연다.
  const openCard = async () => {
    seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await showTimetable(user);
    await user.click(timeCard('09:00'));
    return [user, blockPanel()];
  };
  const savedTodos = () => stored('planner_time_blocks')['2026-01-05'][0].todos ?? [];

  it('입력칸에 쓰고 Enter를 누르면 할 일이 더해지고, 커서가 남아 바로 다음 할 일을 쓸 수 있다', async () => {
    const [user, detail] = await openCard();
    const input = within(detail).getByRole('textbox', { name: '새 할 일' });
    await user.type(input, '자료 출력{Enter}');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await user.keyboard('회의실 예약{Enter}');
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(savedTodos().map((t) => [t.text, t.done])).toEqual([['자료 출력', false], ['회의실 예약', false]]);
    expect(within(detail).getByRole('button', { name: '자료 출력 고치기' })).toBeInTheDocument();
  });

  it('빈 글자는 더하지 않는다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '   {Enter}');
    expect(savedTodos()).toEqual([]);
  });

  it('체크하면 완료로 저장되고 줄이 그어지며, 제목 줄 오른쪽 끝에 "완료 / 전체"가 보인다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '하나{Enter}둘{Enter}');
    expect(within(detail).getByLabelText('2개 중 0개 완료')).toHaveTextContent('0 / 2');

    await user.click(within(detail).getByRole('checkbox', { name: '하나 완료' }));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(savedTodos().map((t) => t.done)).toEqual([true, false]);
    expect(within(detail).getByRole('button', { name: '하나 고치기' })).toHaveClass('line-through');
    expect(within(detail).getByLabelText('2개 중 1개 완료')).toHaveTextContent('1 / 2');
    // 진행 숫자는 제목 줄 오른쪽 끝에, 끝낸 수는 굵은 파랑으로 (리디자인: 막대 없이 "1 / 2")
    expect(within(detail).getByLabelText('2개 중 1개 완료')).toHaveClass('ml-auto');
    expect(within(within(detail).getByLabelText('2개 중 1개 완료')).getByText('1')).toHaveClass('font-bold', 'text-primary');
    expect(savedTodos().map((t) => t.text)).toEqual(['하나', '둘']); // 완료해도 순서는 그대로
  });

  it('글자를 누르면 고칠 수 있고 Enter로 저장된다. Esc는 고치기만 취소하고 패널은 닫지 않는다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '자료 출력{Enter}');
    await user.click(within(detail).getByRole('button', { name: '자료 출력 고치기' }));
    const edit = within(detail).getByRole('textbox', { name: '할 일 고치기' });
    await user.clear(edit);
    await user.type(edit, '자료 20부 출력{Enter}');
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(savedTodos().map((t) => t.text)).toEqual(['자료 20부 출력']);

    await user.click(within(detail).getByRole('button', { name: '자료 20부 출력 고치기' }));
    await user.type(within(detail).getByRole('textbox', { name: '할 일 고치기' }), ' 취소될 글자');
    await user.keyboard('{Escape}');
    expect(queryBlockPanel()).toBeInTheDocument();
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(savedTodos().map((t) => t.text)).toEqual(['자료 20부 출력']);
  });

  it('고치다가 글자를 다 지우면 그 할 일이 사라지고, ✕로도 지울 수 있다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '하나{Enter}둘{Enter}');
    await user.click(within(detail).getByRole('button', { name: '하나 고치기' }));
    await user.clear(within(detail).getByRole('textbox', { name: '할 일 고치기' }));
    await user.keyboard('{Enter}');
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(savedTodos().map((t) => t.text)).toEqual(['둘']);

    await user.click(within(detail).getByRole('button', { name: '둘 삭제' }));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(savedTodos()).toEqual([]);
    expect(within(detail).queryByLabelText(/개 완료$/)).toBeNull(); // 할 일이 없으면 "0/0"도 안 보인다
  });

  it('할 일은 카드마다 따로 저장되고, 패널을 닫았다 다시 열어도 남아 있다', async () => {
    seedDaily({ '2026-01-05': [
      { hour: 9, content: '회의', is_important: false, color: COLOR.blue },
      { hour: 14, content: '미팅', is_important: false, color: COLOR.mint },
    ] });
    const user = setup();
    const row = (name) => within(dayPanel()).getByRole('button', { name: new RegExp(`^${name} `) }); // 패널 목록의 시간 일정 줄
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(row('회의'));
    await user.type(within(blockPanel()).getByRole('textbox', { name: '새 할 일' }), '회의 자료{Enter}');
    await user.click(row('미팅'));
    expect(within(blockPanel()).queryByRole('button', { name: '회의 자료 고치기' })).toBeNull();

    await user.click(buttonIn(dayPanel(), '닫기'));
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(row('회의'));
    expect(within(blockPanel()).getByRole('button', { name: '회의 자료 고치기' })).toBeInTheDocument();
  });

  it('시간표 카드에 할 일 진행 숫자(완료 / 전체)가 보이고, 달력 칸에는 보이지 않는다', async () => {
    const [user, detail] = await openCard();
    expect(within(timeCard('09:00')).queryByTestId('todo-progress')).toBeNull(); // 할 일이 없으면 표시 없음

    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '하나{Enter}둘{Enter}');
    await user.click(within(detail).getByRole('checkbox', { name: '하나 완료' }));
    const card = timeCard('09:00');
    expect(within(card).getByTestId('todo-progress')).toHaveTextContent('1 / 2');
    expect(within(card).getByTestId('todo-progress').parentElement).toHaveClass('bg-card', 'rounded-full'); // 카드 색 위에서도 읽히게 흰 알약
    // 진행 표시는 시각 바로 앞(오른쪽 끝 묶음)에 있다
    expect(within(card).getByTestId('todo-progress').parentElement.nextElementSibling).toHaveTextContent('09:00–10:00');
    expect(card).toHaveAccessibleName('09:00–10:00 회의, 할 일 2개 중 1개 완료');

    await user.click(within(detail).getByRole('checkbox', { name: '둘 완료' }));
    expect(within(timeCard('09:00')).getByTestId('todo-progress')).toHaveTextContent('2 / 2');

    expect(within(cellOf('2026-01-05')).queryByText('/ 2')).toBeNull();
    expect(within(cellOf('2026-01-05')).queryByTestId('todo-progress')).toBeNull();
  });

  it('이름 없이 만든 카드도 할 일을 적어 두면 닫아도 사라지지 않는다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await showTimetable(user);
    dragTime(30); // 15:00 칸
    await user.type(within(blockPanel()).getByRole('textbox', { name: '새 할 일' }), '전화하기{Enter}');
    await user.click(buttonIn(blockPanel(), '시간 일정 상세 닫기'));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_time_blocks')['2026-01-05']).toEqual([
      expect.objectContaining({ start: '15:00', content: '', todos: [expect.objectContaining({ text: '전화하기' })] }),
    ]);
  });
});

describe('일정 패널의 할 일 구역 (그날의 할 일을 한곳에)', () => {
  // 기간 일정 하나(할 일 2개, 그중 1개 끝냄)와 시간 카드 하나(할 일 2개)를 넣고 1월 5일 패널을 연다
  const openWithTodos = async () => {
    seedEvents([{ ...makeEvent(1, '포트폴리오', '2026-01-04', '2026-01-08', COLOR.pink), todos: [
      { id: 'e1', text: '표지 다시 그리기', done: true },
      { id: 'e2', text: '설명 줄이기', done: false },
    ] }]);
    localStorage.setItem('planner_time_blocks', JSON.stringify({ '2026-01-05': [
      { id: 'b1', start: '09:00', end: '10:00', content: '스터디', color: COLOR.blue, is_important: false, todos: [
        { id: 't1', text: '문제 3번', done: false },
        { id: 't2', text: '오답 정리', done: false },
      ] },
    ] }));
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    return [user, within(dayPanel()).getByRole('region', { name: /^할 일/ })];
  };

  it('기간 일정과 시간 카드의 할 일이 모이고, 머리 줄 오른쪽에 진행 숫자, 줄마다 일정 이름 꼬리표가 붙는다', async () => {
    const [, todos] = await openWithTodos();
    expect(within(todos).getByLabelText('4개 중 1개 완료')).toHaveTextContent('1 / 4');
    const left = within(todos).getByRole('list', { name: '남은 할 일' });
    expect(within(left).getAllByRole('checkbox').map((c) => c.closest('label').textContent)).toEqual([
      '설명 줄이기포트폴리오', '문제 3번스터디', '오답 정리스터디',
    ]);
    // 끝낸 일은 눌러야 보인다
    expect(within(todos).queryByText('표지 다시 그리기')).toBeNull();
  });

  it('"끝낸 일 n개 보기"를 누르면 끝낸 일이 줄이 그어져 보인다', async () => {
    const [user, todos] = await openWithTodos();
    await user.click(within(todos).getByRole('button', { name: /끝낸 일 1개 보기/ }));
    expect(within(todos).getByText('표지 다시 그리기')).toHaveClass('line-through');
  });

  it('여기서 체크하면 그 일정(시간 카드·기간 일정)의 할 일로 저장된다', async () => {
    const [user, todos] = await openWithTodos();
    await user.click(within(todos).getByRole('checkbox', { name: /문제 3번/ }));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_time_blocks')['2026-01-05'][0].todos.map((t) => t.done)).toEqual([true, false]);
    await user.click(within(todos).getByRole('checkbox', { name: /설명 줄이기/ }));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_events')[0].todos.map((t) => t.done)).toEqual([true, true]);
    expect(within(todos).getByLabelText('4개 중 3개 완료')).toBeInTheDocument();
  });

  it('시간표 모드에서는 남은 할 일을 2개만 보이고, 목록 아래 "남은 할 일 n개 더보기"로 펼친다', async () => {
    const [user] = await openWithTodos();
    await showTimetable(user);
    const todos = within(dayPanel()).getByRole('region', { name: /^할 일/ });
    expect(within(within(todos).getByRole('list', { name: '남은 할 일' })).getAllByRole('checkbox')).toHaveLength(2);
    await user.click(within(todos).getByRole('button', { name: /남은 할 일 1개 더보기/ }));
    expect(within(within(todos).getByRole('list', { name: '남은 할 일' })).getAllByRole('checkbox')).toHaveLength(3);
  });

  it('할 일이 없으면 어디에 적는지 안내한다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    const todos = within(dayPanel()).getByRole('region', { name: /^할 일/ });
    expect(within(todos).getByText('시간 일정이나 기간 일정에 할 일을 적으면 여기에 모여요.')).toBeInTheDocument();
    expect(within(todos).queryByLabelText(/개 완료$/)).toBeNull();
  });
});
