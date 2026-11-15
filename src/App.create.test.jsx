import { describe, it, expect } from 'vitest';
import { within, waitFor } from '@testing-library/react';
import { setupTestEnvironment, COLOR, barIn, buttonIn, cellOf, colorButtonsIn, dayPanel, drag, editIconOf, hexToRgb, dayButtonOf, makeEvent, popup, popupCount, queryDayPanel, queryPopup, seedDaily, seedEvents, setup, stored } from './test/helpers';

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
      expect(barIn(cellOf(date), '여름 워크숍')).toHaveStyle({ backgroundColor: hexToRgb(COLOR.pink) });
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

  it('칸 안의 일정 막대를 누르면 패널이 아니라 그 일정의 수정 팝업이 열린다', async () => {
    seedEvents([makeEvent(1, '여름 워크숍', '2026-01-05', '2026-01-06')]);
    const user = setup();
    await user.click(within(cellOf('2026-01-05')).getByText('여름 워크숍'));
    expect(popup('일정 수정')).toBeInTheDocument();
    expect(queryDayPanel()).toBeNull();
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

    it('패널은 위·오른쪽이 화면 가장자리에서 24px, 아래는 12px 떨어진 둥근 카드다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(box).toHaveClass('sticky', 'top-6', 'mt-6', 'mb-3', 'mr-6', 'h-[calc(100vh-36px)]', 'rounded-lg', 'border');
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

    it('목록의 연필은 수정 팝업을, X는 삭제 확인을 패널 위에 연다', async () => {
      seedEvents([makeEvent(1, '고칠 일정', '2026-01-05')]);
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      await user.click(editIconOf(barIn(box, '고칠 일정')));
      expect(within(popup('일정 수정')).getByDisplayValue('고칠 일정')).toBeInTheDocument();
      expect(dayPanel()).toBeInTheDocument();
    });
  });

  describe('② 시간 일정 (24줄, 입력하면 바로 저장)', () => {
    it('시간대 입력줄이 24개 있다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      expect(within(box).getAllByPlaceholderText('내용 입력')).toHaveLength(24);
    });

    it('입력하는 즉시 달력과 저장소에 반영되고, "주요" 체크도 함께 저장된다 (저장 버튼 없음)', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const rows = within(box).getAllByPlaceholderText('내용 입력');
      await user.type(rows[9], '아침 회의');
      await user.click(within(rows[9].parentElement).getByRole('checkbox'));
      await user.type(rows[10], '체크 없는 일정');

      expect(within(box).queryByRole('button', { name: /저장/ })).toBeNull();
      const cell = cellOf('2026-01-05');
      expect(within(cell).getByText('09:00')).toBeInTheDocument();
      expect(within(cell).getByText('아침 회의')).toBeInTheDocument();
      expect(within(cell).getByText('체크 없는 일정')).toBeInTheDocument();

      const saved = stored('planner_time_blocks')['2026-01-05'];
      expect(saved.map((s) => [s.start, s.end, s.content, s.is_important])).toEqual([
        ['09:00', '10:00', '아침 회의', true],
        ['10:00', '11:00', '체크 없는 일정', false],
      ]);
    });

    it('글자를 여러 번 쳐도 같은 카드로 저장된다 (카드 id가 바뀌지 않는다)', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const row = within(box).getAllByPlaceholderText('내용 입력')[9];
      await user.type(row, '회');
      const firstId = stored('planner_time_blocks')['2026-01-05'][0].id;
      await user.type(row, '의');
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([expect.objectContaining({ id: firstId, content: '회의' })]);
    });

    it('내용을 지우면 그 시간 일정이 사라지고, 빈 줄은 저장되지 않는다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '지울 일정', is_important: false, color: COLOR.blue }] });
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      await user.clear(within(box).getAllByPlaceholderText('내용 입력')[9]);
      expect(stored('planner_time_blocks')['2026-01-05']).toEqual([]);
      expect(within(cellOf('2026-01-05')).queryByText('지울 일정')).toBeNull();
    });

    it('색을 먼저 고르고 내용을 쓰면 고른 색으로 저장된다', async () => {
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      await user.click(within(within(box).getByRole('group', { name: '09:00 일정 색' })).getByRole('button', { name: '앰버' }));
      await user.type(within(box).getByRole('textbox', { name: '09:00 일정 내용' }), '색 먼저');
      expect(stored('planner_time_blocks')['2026-01-05'][0].color).toBe(COLOR.amber);
    });

    it('같은 날짜를 다시 열면 저장해 둔 내용이 채워져 있다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 9, content: '아침 회의', is_important: true, color: COLOR.purple }] });
      const user = setup();
      const box = await openPanel(user, '2026-01-05');
      const rows = within(box).getAllByPlaceholderText('내용 입력');
      expect(rows[9]).toHaveValue('아침 회의');
      expect(within(rows[9].parentElement).getByRole('checkbox')).toBeChecked();
      expect(rows[10]).toHaveValue('');
    });

    it('다음 날로 넘겨도 앞 날짜에 쓴 내용은 남아 있고, 다른 날짜에 섞이지 않는다', async () => {
      const user = setup();
      await openPanel(user, '2026-01-05');
      await user.type(within(dayPanel()).getAllByPlaceholderText('내용 입력')[9], '이 날 일정');
      await user.click(buttonIn(dayPanel(), '다음 날'));
      expect(within(dayPanel()).getAllByPlaceholderText('내용 입력')[9]).toHaveValue('');
      await user.type(within(dayPanel()).getAllByPlaceholderText('내용 입력')[9], '다음 날 일정');

      const daily = stored('planner_time_blocks');
      expect(daily['2026-01-05'].map((b) => b.content)).toEqual(['이 날 일정']);
      expect(daily['2026-01-06'].map((b) => b.content)).toEqual(['다음 날 일정']);
    });

    it('칸의 시간 일정을 누르면 패널이 열리고, 그 시간 줄이 강조되며 입력칸에 커서가 놓인다', async () => {
      seedDaily({ '2026-01-05': [
        { hour: 9, content: '아침 회의', is_important: false, color: COLOR.blue },
        { hour: 14, content: '고객사 미팅', is_important: true, color: COLOR.amber },
      ] });
      const user = setup();
      await user.click(within(cellOf('2026-01-05')).getByText('고객사 미팅'));

      const box = dayPanel();
      const input = within(box).getByRole('textbox', { name: '14:00 일정 내용' });
      await waitFor(() => expect(input).toHaveFocus());
      expect(input.parentElement).toHaveClass('border-primary');
      expect(within(box).getByRole('textbox', { name: '09:00 일정 내용' }).parentElement).not.toHaveClass('border-primary');
    });

    it('칸의 빈 곳으로 열면 강조된 시간 줄이 없다', async () => {
      seedDaily({ '2026-01-05': [{ hour: 14, content: '고객사 미팅', is_important: true, color: COLOR.amber }] });
      const user = setup();
      await user.click(within(cellOf('2026-01-05')).getByText('고객사 미팅'));
      await user.click(cellOf('2026-01-05'));
      const box = dayPanel();
      expect(box.querySelector('.border-primary')).toBeNull();
      expect(within(box).getByRole('textbox', { name: '14:00 일정 내용' })).not.toHaveFocus();
    });
  });
});

describe('팝업 버튼의 종류(모양): 취소는 outline, 저장은 primary', () => {
  it('기간 등록 팝업', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    const box = popup('기간 일정 등록');
    expect(buttonIn(box, '취소')).toHaveClass('border-border', 'bg-background');
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
