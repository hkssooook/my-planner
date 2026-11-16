import { describe, it, expect } from 'vitest';
import { within, waitFor } from '@testing-library/react';
import { setupTestEnvironment, COLOR, barIn, blockPanel, buttonIn, cellOf, colorButtonsIn, dayPanel, drag, dragCard, dragTime, eventPanel, queryBlockPanel, timeCard, timeGrid, hexToRgb, dayButtonOf, makeEvent, popup, popupCount, queryDayPanel, queryPopup, seedDaily, seedEvents, setup, stored } from './test/helpers';
import { eventColors } from './utils/color';

// 새 일정을 만드는 두 가지 방법(날짜 끌기 / 날짜 칸을 눌러 오른쪽 일정 패널 열기)을 확인하는 시험.
// 공통 도우미와 "오늘 = 2026-06-15" 고정은 src/test/helpers.jsx 참고.

setupTestEnvironment();

describe('기간 일정 만들기 (날짜 끌기)', () => {
  it('날짜를 끌었다 놓으면 기간이 적힌 등록 팝업이 열린다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');

    const box = popup('기간 일정 등록');
    expect(within(box).getByText('2026-01-05 ~ 2026-01-07')).toBeInTheDocument();
  });

  it('거꾸로(뒤 날짜에서 앞 날짜로) 끌어도 기간이 날짜 순서로 적힌다', async () => {
    const user = setup();
    await drag(user, '2026-01-07', '2026-01-05');
    expect(within(popup('기간 일정 등록')).getByText('2026-01-05 ~ 2026-01-07')).toBeInTheDocument();
  });

  it('한 칸만 눌렀다 놓으면 팝업이 열리지 않는다', async () => {
    const user = setup();
    await user.pointer([{ keys: '[MouseLeft>]', target: cellOf('2026-01-05') }, { keys: '[/MouseLeft]' }]);
    expect(queryPopup('기간 일정 등록')).toBeNull();
  });

  it('팝업이 열려 있는 동안 고른 칸이 강조되고, 닫으면 강조가 풀린다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    expect(cellOf('2026-01-06')).toHaveClass('bg-selection');
    expect(cellOf('2026-01-08')).not.toHaveClass('bg-selection');

    await user.click(buttonIn(popup('기간 일정 등록'), '취소'));
    expect(cellOf('2026-01-06')).not.toHaveClass('bg-selection');
  });

  it('이름과 색을 입력해 저장하면 기간의 모든 날짜 칸에 그 색의 막대가 생기고 저장소에도 저장된다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const box = popup('기간 일정 등록');
    await user.type(within(box).getByPlaceholderText('일정명 입력'), '여름 워크숍');
    await user.click(colorButtonsIn(box)[2]); // 세 번째 색(핑크)
    await user.click(buttonIn(box, '저장'));

    expect(queryPopup('기간 일정 등록')).toBeNull();
    for (const date of ['2026-01-05', '2026-01-06', '2026-01-07']) {
      expect(barIn(cellOf(date), '여름 워크숍')).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.pink).background) });
    }
    expect(within(cellOf('2026-01-08')).queryByText('여름 워크숍')).not.toBeInTheDocument();
    expect(stored('planner_events')).toEqual([
      expect.objectContaining({ title: '여름 워크숍', start_date: '2026-01-05', end_date: '2026-01-07', color: COLOR.pink }),
    ]);
  });

  it('이름을 비우고 저장하면 일정은 만들어지지 않고 팝업만 닫힌다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    await user.click(buttonIn(popup('기간 일정 등록'), '저장'));

    expect(queryPopup('기간 일정 등록')).toBeNull();
    expect(localStorage.getItem('planner_events')).toBeNull();
  });

  it('취소하면 일정이 만들어지지 않고, 다시 열면 입력칸이 비어 있다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    await user.type(within(popup('기간 일정 등록')).getByPlaceholderText('일정명 입력'), '버릴 이름');
    await user.click(buttonIn(popup('기간 일정 등록'), '취소'));

    expect(queryPopup('기간 일정 등록')).toBeNull();
    expect(localStorage.getItem('planner_events')).toBeNull();

    await drag(user, '2026-01-10', '2026-01-12');
    expect(within(popup('기간 일정 등록')).getByPlaceholderText('일정명 입력')).toHaveValue('');
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

  it('두 칸 이상 끌면 기간 일정 등록만 열리고 패널은 열리지 않는다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    expect(popup('기간 일정 등록')).toBeInTheDocument();
    expect(queryDayPanel()).toBeNull();
  });

  describe('① 이 날의 일정 (기간·종일)', () => {
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

    it('머리말과 "이 날의 일정"은 패널을 스크롤해도 위에 고정되고, 목록이 길면 목록 안에서만 스크롤된다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const pinned = within(box).getByTestId('day-panel-pinned');
      expect(pinned).toHaveClass('sticky', 'top-0');
      expect(within(pinned).getByRole('heading', { name: '2026년 1월 5일 (월)' })).toBeInTheDocument();
      expect(within(pinned).getByRole('region', { name: /이 날의 일정/ })).toBeInTheDocument();
      expect(within(pinned).queryByRole('region', { name: '종일 일정 추가' })).toBeNull();
      expect(within(pinned).getByRole('list')).toHaveClass('max-h-[200px]', 'overflow-y-auto');
    });

    it('패널은 너비 460px이고, 위는 화면 가장자리에서 24px, 오른쪽·아래는 12px 떨어진 둥근 카드다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(box).toHaveClass('w-[460px]', 'sticky', 'top-6', 'mt-6', 'mb-3', 'mr-3', 'h-[calc(100vh-36px)]', 'rounded-lg', 'border');
      expect(box).not.toHaveClass('my-6', 'rounded-t-lg', 'border-b-0');
    });

    it('종일 일정 "추가" 버튼은 파랑 2단계 바탕(secondary)이다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const add = buttonIn(within(box).getByRole('region', { name: '종일 일정 추가' }), '추가');
      expect(add).toHaveClass('bg-secondary');
      expect(add).not.toHaveClass('bg-background');
    });

    it('목록과 종일 일정 추가는 따로 나뉜 영역이고, 일정이 없으면 없다는 안내가 보인다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const list = within(box).getByRole('region', { name: /이 날의 일정/ });
      const add = within(box).getByRole('region', { name: '종일 일정 추가' });
      expect(within(list).getByText('이 날에 걸친 기간·종일 일정이 없어요.')).toBeInTheDocument();
      expect(within(list).queryByRole('textbox')).toBeNull();
      expect(within(add).getByRole('textbox', { name: '종일 일정명' })).toBeInTheDocument();
    });

    it('종일 일정을 입력하고 추가하면 곧바로 패널 목록과 달력 칸에 생기고 저장된다. 입력칸은 비워진다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      await user.type(within(box).getByRole('textbox', { name: '종일 일정명' }), '종일 워크숍');
      await user.click(within(within(box).getByRole('group', { name: '종일 일정 색' })).getByRole('button', { name: '앰버' }));
      await user.click(buttonIn(within(box).getByRole('region', { name: '종일 일정 추가' }), '추가'));

      expect(barIn(box, '종일 워크숍')).toBeInTheDocument();
      expect(within(cellOf('2026-01-05')).getByText('종일 워크숍')).toBeInTheDocument();
      expect(stored('planner_events')).toEqual([
        expect.objectContaining({ title: '종일 워크숍', start_date: '2026-01-05', end_date: '2026-01-05', color: COLOR.amber }),
      ]);
      expect(within(box).getByRole('textbox', { name: '종일 일정명' })).toHaveValue('');
    });

    it('Enter로도 추가되고, 이름이 비어 있으면 추가되지 않는다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const input = within(box).getByRole('textbox', { name: '종일 일정명' });
      await user.type(input, '   {Enter}');
      expect(localStorage.getItem('planner_events')).toBeNull();
      await user.type(input, '엔터 일정{Enter}');
      expect(stored('planner_events').map((e) => e.title)).toEqual(['엔터 일정']);
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
    it('0~24시를 30분 칸 48개로 나눈 시간표가 있고, 정각마다 시각이 적혀 있다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(timeGrid()).toHaveStyle({ height: `${48 * 24}px` });
      const grid = within(box).getByTestId('time-grid-scroll');
      for (const time of ['00:00', '08:00', '23:00']) expect(within(grid).getByText(time)).toBeInTheDocument();
      expect(within(grid).queryByText('08:30')).toBeNull(); // 30분 줄에는 글자 없이 점선만
      expect(within(box).queryByPlaceholderText('내용 입력')).toBeNull(); // 예전 24줄 입력칸은 없다
    });

    it('빈 칸을 끌면 30분 단위로 카드가 생기고, 오른쪽 카드 상세 패널이 열려 이름 칸에 커서가 놓인다', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(18, 20); // 09:00 칸 ~ 10:00 칸 → 09:00~10:30

      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([
        expect.objectContaining({ start: '09:00', end: '10:30', content: '', is_important: false, color: COLOR.blue }),
      ]);
      const detail = blockPanel();
      expect(within(detail).getByText(/09:00–10:30/)).toBeInTheDocument();
      await waitFor(() => expect(within(detail).getByRole('textbox', { name: '이름' })).toHaveFocus());
      expect(timeCard('09:00')).toHaveAttribute('aria-pressed', 'true');
    });

    it('카드는 시작 시각 줄 바로 아래에서 끝 시각 줄 바로 위까지 채운다 (위·아래 모두 줄에 딱 붙음)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openPanel(user, '2026-01-05');
      // 한 칸 24px, 줄 1px: 09:00 줄은 432~433px, 10:00 줄은 480px부터 → 카드는 433px부터 47px(= 480 − 433)
      expect(timeCard('09:00')).toHaveStyle({ top: '433px', height: '47px' });
    });

    it('위로 끌어도 되고, 누르기만 하면 30분 카드가 생긴다', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(29, 27); // 14:30 칸에서 13:30 칸으로 → 13:30~15:00
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '오후');
      dragTime(40); // 20:00 칸 클릭 → 20:00~20:30
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end])).toEqual([['13:30', '15:00'], ['20:00', '20:30']]);
    });

    it('끄는 중에 기존 카드에 닿으면 그 앞에서 멈추고, 카드가 있는 칸에서는 새 카드가 시작되지 않는다 (겹침 없음)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 10, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(16, 24); // 08:00부터 12:00까지 끌었지만 10:00 회의 앞에서 멈춘다
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '준비');
      dragTime(21); // 10:30 칸은 회의(10:00~11:00) 안이라 아무 일도 없다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end, b.content])).toEqual([
        ['08:00', '10:00', '준비'],
        ['10:00', '11:00', '회의'],
      ]);
    });

    it('카드 상세 패널에서 이름·색·주요를 바꾸면 바로 저장되고, 달력 칸과 시간표 카드에 반영된다 (같은 카드 id 유지)', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(18, 19);
      const id = stored('planner_time_blocks')['2026-01-05'][0].id;
      const detail = blockPanel();
      await user.type(within(detail).getByRole('textbox', { name: '이름' }), '아침 회의');
      await user.click(within(within(detail).getByRole('group', { name: '시간 일정 색' })).getByRole('button', { name: '앰버' }));
      await user.click(within(detail).getByRole('checkbox', { name: /주요 일정/ }));

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
      await openPanel(user, '2026-01-05');
      dragTime(18);
      await user.click(buttonIn(blockPanel(), '시간 일정 상세 닫기'));
      expect(queryBlockPanel()).toBeNull();
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([]);

      dragTime(20);
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '남길 일정');
      await user.keyboard('{Escape}'); // Esc로도 닫힌다
      expect(queryBlockPanel()).toBeNull();
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => b.content)).toEqual(['남길 일정']);
    });

    it('이름 없는 카드를 둔 채 다른 칸을 끌면, 앞의 빈 카드는 사라지고 새 카드가 남는다', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(18);
      dragTime(30);
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => b.start)).toEqual(['15:00']);
    });

    it('카드를 누르면 그 카드의 상세 패널이 열리고, 삭제 버튼으로 지울 수 있다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '아침 회의', is_important: true, color: COLOR.purple }] });
      const user = setup();
      await openPanel(user, '2026-01-05');
      expect(queryBlockPanel()).toBeNull();
      await user.click(timeCard('09:00'));
      expect(within(blockPanel()).getByRole('textbox', { name: '이름' })).toHaveValue('아침 회의');
      expect(within(blockPanel()).getByRole('checkbox', { name: /주요 일정/ })).toBeChecked();

      await user.click(buttonIn(blockPanel(), '이 시간 일정 삭제'));
      expect(queryBlockPanel()).toBeNull();
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([]);
      expect(within(cellOf('2026-01-05')).queryByText('아침 회의')).toBeNull();
    });

    it('키보드로도 만들 수 있다: 시작·끝 시각을 고르고 "추가" (겹치면 안내가 나오고 만들지 않는다)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 10, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const form = within(box).getByRole('form', { name: '시간 일정 추가' });
      await user.selectOptions(within(form).getByRole('combobox', { name: '시작 시각' }), '09:30');
      await user.selectOptions(within(form).getByRole('combobox', { name: '끝 시각' }), '10:30');
      await user.click(buttonIn(form, '추가'));
      expect(within(box).getByRole('alert')).toHaveTextContent('겹쳐요');
      expect(stored('planner_time_blocks')['2026-01-05']).toHaveLength(1);

      await user.selectOptions(within(form).getByRole('combobox', { name: '끝 시각' }), '10:00');
      await user.click(buttonIn(form, '추가'));
      expect(within(box).queryByRole('alert')).toBeNull();
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end])).toEqual([['09:30', '10:00'], ['10:00', '11:00']]);
      expect(blockPanel()).toBeInTheDocument();
    });

    it('끝 시각은 시작 시각보다 뒤의 시각만 고를 수 있다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      await user.selectOptions(within(box).getByRole('combobox', { name: '시작 시각' }), '23:30');
      const endOptions = within(within(box).getByRole('combobox', { name: '끝 시각' })).getAllByRole('option').map((o) => o.textContent);
      expect(endOptions).toEqual(['24:00']);
    });

    it('다음 날로 넘기면 카드 상세 패널이 닫히고, 날짜마다 카드가 따로 저장된다', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(18);
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '이 날 일정');
      await user.click(buttonIn(dayPanel(), '다음 날'));
      expect(queryBlockPanel()).toBeNull();
      dragTime(18);
      await user.type(within(blockPanel()).getByRole('textbox', { name: '이름' }), '다음 날 일정');

      const daily = stored('planner_time_blocks');
      expect(daily['2026-01-05'].map((b) => b.content)).toEqual(['이 날 일정']);
      expect(daily['2026-01-06'].map((b) => b.content)).toEqual(['다음 날 일정']);
    });

    it('일정 패널을 닫으면 카드 상세 패널도 함께 닫힌다', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragTime(18);
      await user.click(buttonIn(dayPanel(), '닫기'));
      expect(queryDayPanel()).toBeNull();
      expect(queryBlockPanel()).toBeNull();
    });

    it('카드 가운데를 잡고 끌면 길이는 그대로 옮겨지고, 그 카드의 상세 패널이 열린다 (id 유지)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openPanel(user, '2026-01-05');
      const id = stored('planner_time_blocks')['2026-01-05'][0].id;
      dragCard('09:00', 18, 21); // 09:00 칸을 잡고 10:30 칸으로 → 3칸 아래
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
      await openPanel(user, '2026-01-05');
      dragCard('09:00', 18, 28); // 회의를 잡고 14:00 칸으로 → 점심을 넘어간다
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
      await openPanel(user, '2026-01-05');
      dragCard('09:00', 18, 25); // 회의를 12:30 칸(점심 한가운데)에 놓으면 → 점심 바로 뒤 13:00
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.content, b.start, b.end])).toEqual([
        ['점심', '12:00', '13:00'],
        ['회의', '13:00', '14:00'],
      ]);
    });

    it('아래 가장자리를 끌면 끝 시각이, 위 가장자리를 끌면 시작 시각이 30분 단위로 바뀐다 (최소 30분)', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openPanel(user, '2026-01-05');
      dragCard('09:00', 19, 22, 'end'); // 끝을 11:00 칸까지 → 11:30 끝
      dragCard('09:00', 18, 16, 'start'); // 시작을 08:00 칸으로
      const [block] = stored('planner_time_blocks')['2026-01-05'];
      expect([block.start, block.end]).toEqual(['08:00', '11:30']);
      dragCard('08:00', 22, 2, 'end'); // 끝을 시작보다 위로 끌어도 최소 30분은 남는다
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.start, b.end])).toEqual([['08:00', '08:30']]);
    });

    it('카드를 누르기만 하면(칸이 안 바뀌면) 시각은 그대로이고 상세 패널만 열린다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
      const user = setup();
      await openPanel(user, '2026-01-05');
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
      await openPanel(user, '2026-01-05');
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
      expect(stored('planner_time_blocks')['2026-01-05'].map((b) => [b.content, b.start, b.end])).toEqual([
        ['아침', '08:00', '09:00'],
        ['점심', '12:00', '13:00'],
        ['회의', '15:00', '16:00'],
      ]);
      await user.selectOptions(within(blockPanel()).getByRole('combobox', { name: '카드 끝 시각' }), '17:30');
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
      expect(timeCard('14:00')).toHaveAttribute('aria-pressed', 'true');
      expect(timeCard('09:00')).toHaveAttribute('aria-pressed', 'false');
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
    expect(savedTodos().map((t) => [t.text, t.done])).toEqual([['자료 출력', false], ['회의실 예약', false]]);
    expect(within(detail).getByRole('button', { name: '자료 출력 고치기' })).toBeInTheDocument();
  });

  it('빈 글자는 더하지 않는다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '   {Enter}');
    expect(savedTodos()).toEqual([]);
  });

  it('체크하면 완료로 저장되고 줄이 그어지며, 제목 옆에 "완료/전체"가 보인다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '하나{Enter}둘{Enter}');
    expect(within(detail).getByLabelText('2개 중 0개 완료')).toHaveTextContent('0/2');

    await user.click(within(detail).getByRole('checkbox', { name: '하나 완료' }));
    expect(savedTodos().map((t) => t.done)).toEqual([true, false]);
    expect(within(detail).getByRole('button', { name: '하나 고치기' })).toHaveClass('line-through');
    expect(within(detail).getByLabelText('2개 중 1개 완료')).toHaveTextContent('1/2');
    expect(savedTodos().map((t) => t.text)).toEqual(['하나', '둘']); // 완료해도 순서는 그대로
  });

  it('글자를 누르면 고칠 수 있고 Enter로 저장된다. Esc는 고치기만 취소하고 패널은 닫지 않는다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '자료 출력{Enter}');
    await user.click(within(detail).getByRole('button', { name: '자료 출력 고치기' }));
    const edit = within(detail).getByRole('textbox', { name: '할 일 고치기' });
    await user.clear(edit);
    await user.type(edit, '자료 20부 출력{Enter}');
    expect(savedTodos().map((t) => t.text)).toEqual(['자료 20부 출력']);

    await user.click(within(detail).getByRole('button', { name: '자료 20부 출력 고치기' }));
    await user.type(within(detail).getByRole('textbox', { name: '할 일 고치기' }), ' 취소될 글자');
    await user.keyboard('{Escape}');
    expect(queryBlockPanel()).toBeInTheDocument();
    expect(savedTodos().map((t) => t.text)).toEqual(['자료 20부 출력']);
  });

  it('고치다가 글자를 다 지우면 그 할 일이 사라지고, ✕로도 지울 수 있다', async () => {
    const [user, detail] = await openCard();
    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '하나{Enter}둘{Enter}');
    await user.click(within(detail).getByRole('button', { name: '하나 고치기' }));
    await user.clear(within(detail).getByRole('textbox', { name: '할 일 고치기' }));
    await user.keyboard('{Enter}');
    expect(savedTodos().map((t) => t.text)).toEqual(['둘']);

    await user.click(within(detail).getByRole('button', { name: '둘 삭제' }));
    expect(savedTodos()).toEqual([]);
    expect(within(detail).queryByLabelText(/개 완료$/)).toBeNull(); // 할 일이 없으면 "0/0"도 안 보인다
  });

  it('할 일은 카드마다 따로 저장되고, 패널을 닫았다 다시 열어도 남아 있다', async () => {
    seedDaily({ '2026-01-05': [
      { hour: 9, content: '회의', is_important: false, color: COLOR.blue },
      { hour: 14, content: '미팅', is_important: false, color: COLOR.mint },
    ] });
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(timeCard('09:00'));
    await user.type(within(blockPanel()).getByRole('textbox', { name: '새 할 일' }), '회의 자료{Enter}');
    await user.click(timeCard('14:00'));
    expect(within(blockPanel()).queryByRole('button', { name: '회의 자료 고치기' })).toBeNull();

    await user.click(buttonIn(dayPanel(), '닫기'));
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(timeCard('09:00'));
    expect(within(blockPanel()).getByRole('button', { name: '회의 자료 고치기' })).toBeInTheDocument();
  });

  it('시간표 카드에 할 일 진행 상황(완료/전체)이 보이고, 달력 칸에는 보이지 않는다', async () => {
    const [user, detail] = await openCard();
    expect(within(timeCard('09:00')).queryByTestId('todo-progress')).toBeNull(); // 할 일이 없으면 표시 없음

    await user.type(within(detail).getByRole('textbox', { name: '새 할 일' }), '하나{Enter}둘{Enter}');
    await user.click(within(detail).getByRole('checkbox', { name: '하나 완료' }));
    const card = timeCard('09:00');
    expect(within(card).getByTestId('todo-progress')).toHaveTextContent('1/2');
    expect(within(card).getByTestId('todo-progress')).toHaveClass('opacity-70');
    // 진행 표시는 시각 바로 앞(오른쪽 끝 묶음)에 있다
    expect(within(card).getByTestId('todo-progress').nextElementSibling).toHaveTextContent('09:00–10:00');
    expect(card).toHaveAccessibleName('09:00–10:00 회의, 할 일 2개 중 1개 완료');

    await user.click(within(detail).getByRole('checkbox', { name: '둘 완료' }));
    expect(within(timeCard('09:00')).getByTestId('todo-progress')).toHaveTextContent('2/2');
    expect(within(timeCard('09:00')).getByTestId('todo-progress')).not.toHaveClass('opacity-70'); // 다 끝내면 진하게

    expect(within(cellOf('2026-01-05')).queryByText('2/2')).toBeNull();
    expect(within(cellOf('2026-01-05')).queryByTestId('todo-progress')).toBeNull();
  });

  it('이름 없이 만든 카드도 할 일을 적어 두면 닫아도 사라지지 않는다', async () => {
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    dragTime(30); // 15:00 칸
    await user.type(within(blockPanel()).getByRole('textbox', { name: '새 할 일' }), '전화하기{Enter}');
    await user.click(buttonIn(blockPanel(), '시간 일정 상세 닫기'));
    expect(stored('planner_time_blocks')['2026-01-05']).toEqual([
      expect.objectContaining({ start: '15:00', content: '', todos: [expect.objectContaining({ text: '전화하기' })] }),
    ]);
  });
});

describe('팝업 버튼의 종류(모양): 취소는 secondary(파랑 2단계), 저장은 primary', () => {
  it('기간 등록 팝업', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const box = popup('기간 일정 등록');
    expect(buttonIn(box, '취소')).toHaveClass('bg-secondary', 'text-secondary-foreground');
    expect(buttonIn(box, '저장')).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('기간 등록 팝업: shadcn 기본 모양(바깥 여백 p-4, 둥근 모서리)이고, 버튼줄은 오른쪽 정렬이다', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const box = popup('기간 일정 등록');
    expect(box).toHaveClass('rounded-xl', 'p-4', 'sm:max-w-sm'); // 팝업 너비: 중간
    expect(buttonIn(box, '저장').parentElement).toHaveClass('sm:justify-end');
    expect(buttonIn(box, '취소').parentElement).toHaveClass('sm:justify-end');
    expect(buttonIn(box, '저장')).not.toHaveClass('flex-1'); // 폭을 반씩 나눠 갖지 않는다
  });

  it('기간 등록 팝업: 제목줄의 X 버튼으로 닫을 수 있다 (저장하지 않고 선택 표시도 풀린다)', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    await user.click(within(popup('기간 일정 등록')).getByRole('button', { name: '닫기' })); // 오른쪽 위 X

    expect(queryPopup('기간 일정 등록')).toBeNull();
    expect(cellOf('2026-01-06')).not.toHaveClass('bg-selection');
    expect(localStorage.getItem('planner_events')).toBeNull();
  });
});
