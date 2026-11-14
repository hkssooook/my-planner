import { describe, it, expect } from 'vitest';
import { within } from '@testing-library/react';
import { setupTestEnvironment, COLOR, barIn, buttonIn, cellOf, colorButtonsIn, drag, hexToRgb, plusButtonOf, popup, queryPopup, seedDaily, setup, stored } from './test/helpers';

// 새 일정을 만드는 두 가지 방법(날짜 끌기 / 날짜 칸의 + 버튼)을 확인하는 시험.
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

describe('상세 일정 (날짜 칸의 + 버튼)', () => {
  const openDaily = async (user, date) => {
    await user.click(plusButtonOf(date));
    return popup('상세 일정 관리');
  };

  it('+ 버튼을 누르면 그 날짜의 상세 일정 팝업이 열리고 시간대 입력줄이 24개 있다', async () => {
    const user = setup();
    const box = await openDaily(user, '2026-01-05');

    expect(within(box).getByText('2026-01-05')).toBeInTheDocument();
    expect(within(box).getAllByPlaceholderText('내용 입력')).toHaveLength(24);
  });

  it('종일 일정을 입력해 저장하면 그 날짜 칸에 막대가 생긴다', async () => {
    const user = setup();
    const box = await openDaily(user, '2026-01-05');
    await user.type(within(box).getByPlaceholderText('예: 워크숍 일정'), '종일 워크숍');
    await user.click(buttonIn(box, '통합 저장'));

    expect(queryPopup('상세 일정 관리')).toBeNull();
    expect(within(cellOf('2026-01-05')).getByText('종일 워크숍')).toBeInTheDocument();
    expect(stored('planner_events')).toEqual([
      expect.objectContaining({ title: '종일 워크숍', start_date: '2026-01-05', end_date: '2026-01-05' }),
    ]);
  });

  it('시간대별 일정은 체크와 상관없이 모두 달력에 보이고, "주요" 체크도 함께 저장된다', async () => {
    const user = setup();
    const box = await openDaily(user, '2026-01-05');
    const rows = within(box).getAllByPlaceholderText('내용 입력');

    await user.type(rows[9], '아침 회의');
    await user.click(within(rows[9].parentElement).getByRole('checkbox')); // 9시 줄만 "주요" 체크
    await user.type(rows[10], '체크 없는 일정');
    await user.click(buttonIn(box, '통합 저장'));

    const cell = cellOf('2026-01-05');
    expect(within(cell).getByText('09:00')).toBeInTheDocument();
    expect(within(cell).getByText('아침 회의')).toBeInTheDocument();
    expect(within(cell).getByText('체크 없는 일정')).toBeInTheDocument();

    const saved = stored('planner_daily')['2026-01-05'];
    expect(saved.map((s) => [s.hour, s.content, s.is_important])).toEqual([
      [9, '아침 회의', true],
      [10, '체크 없는 일정', false],
    ]);
  });

  it('내용이 빈 시간대는 저장하지 않는다', async () => {
    const user = setup();
    const box = await openDaily(user, '2026-01-05');
    await user.type(within(box).getAllByPlaceholderText('내용 입력')[3], '새벽 일정');
    await user.click(buttonIn(box, '통합 저장'));

    expect(stored('planner_daily')['2026-01-05']).toHaveLength(1);
  });

  it('같은 날짜를 다시 열면 저장해 둔 시간대별 내용이 채워져 있고 종일 입력칸은 비어 있다', async () => {
    seedDaily({ '2026-01-05': [{ hour: 9, content: '아침 회의', is_important: true, color: COLOR.purple }] });
    const user = setup();
    const box = await openDaily(user, '2026-01-05');
    const rows = within(box).getAllByPlaceholderText('내용 입력');

    expect(rows[9]).toHaveValue('아침 회의');
    expect(within(rows[9].parentElement).getByRole('checkbox')).toBeChecked();
    expect(rows[10]).toHaveValue('');
    expect(within(box).getByPlaceholderText('예: 워크숍 일정')).toHaveValue('');
  });

  it('취소하면 입력한 내용이 저장되지 않는다', async () => {
    const user = setup();
    const box = await openDaily(user, '2026-01-05');
    await user.type(within(box).getAllByPlaceholderText('내용 입력')[9], '버릴 내용');
    await user.type(within(box).getByPlaceholderText('예: 워크숍 일정'), '버릴 종일 일정');
    await user.click(buttonIn(box, '취소'));

    expect(queryPopup('상세 일정 관리')).toBeNull();
    expect(localStorage.getItem('planner_daily')).toBeNull();
    expect(localStorage.getItem('planner_events')).toBeNull();
  });

  it('한 날짜의 저장이 다른 날짜의 시간대별 일정에 영향을 주지 않는다', async () => {
    seedDaily({ '2026-01-06': [{ hour: 9, content: '다른 날 일정', is_important: true, color: COLOR.blue }] });
    const user = setup();
    const box = await openDaily(user, '2026-01-05');
    await user.type(within(box).getAllByPlaceholderText('내용 입력')[9], '이 날 일정');
    await user.click(buttonIn(box, '통합 저장'));

    const daily = stored('planner_daily');
    expect(daily['2026-01-06'][0].content).toBe('다른 날 일정');
    expect(daily['2026-01-05'][0].content).toBe('이 날 일정');
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

  it('상세 일정 팝업: 버튼줄은 오른쪽 정렬이다', async () => {
    const user = setup();
    await user.click(plusButtonOf('2026-01-05'));
    const box = popup('상세 일정 관리');
    expect(buttonIn(box, '통합 저장').parentElement).toHaveClass('sm:justify-end');
    expect(buttonIn(box, '통합 저장')).not.toHaveClass('flex-1');
  });

  it('기간 등록 팝업: 제목줄의 X 버튼으로 닫을 수 있다 (저장하지 않고 선택 표시도 풀린다)', async () => {
    const user = setup();
    await drag(user, '2026-01-05', '2026-01-07');
    await user.click(within(popup('기간 일정 등록')).getByRole('button', { name: '닫기' })); // 오른쪽 위 X

    expect(queryPopup('기간 일정 등록')).toBeNull();
    expect(cellOf('2026-01-06')).not.toHaveClass('bg-selection');
    expect(localStorage.getItem('planner_events')).toBeNull();
  });

  it('상세 일정 팝업: 제목줄의 X 버튼으로 닫을 수 있다 (저장하지 않는다)', async () => {
    const user = setup();
    await user.click(plusButtonOf('2026-01-05'));
    await user.type(within(popup('상세 일정 관리')).getByPlaceholderText('예: 워크숍 일정'), '저장되면 안 됨');
    await user.click(within(popup('상세 일정 관리')).getByRole('button', { name: '닫기' }));

    expect(queryPopup('상세 일정 관리')).toBeNull();
    expect(localStorage.getItem('planner_events')).toBeNull();
  });

  it('상세 일정 팝업: 화면의 90%까지만 커지고, 넘치면 안쪽 내용이 스크롤된다', async () => {
    const user = setup();
    await user.click(plusButtonOf('2026-01-05'));
    const box = popup('상세 일정 관리');
    expect(box).toHaveClass('max-h-[90vh]', 'sm:max-w-lg'); // 흰 상자의 크기 제한
    // 스크롤 영역은 흰 상자의 바로 아래 자식이어야 한다. (안쪽 시간대 목록에도 스크롤이 있어서 그냥 찾으면 하나가 빠져도 통과한다)
    expect([...box.children].some((child) => child.classList.contains('overflow-y-auto'))).toBe(true);
  });

  it('상세 일정 팝업', async () => {
    const user = setup();
    await user.click(plusButtonOf('2026-01-05'));
    const box = popup('상세 일정 관리');
    expect(buttonIn(box, '취소')).toHaveClass('border-border', 'bg-background');
    expect(buttonIn(box, '통합 저장')).toHaveClass('bg-primary', 'text-primary-foreground');
  });
});
