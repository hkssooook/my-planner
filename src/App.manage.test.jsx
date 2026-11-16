import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import App from './App';
import { setupTestEnvironment, COLOR, barIn, buttonIn, cellOf, colorButtonsIn, dayPanel, deleteIconOf, editIconOf, hexToRgb, makeEvent, popup, popupCount, queryDayPanel, queryPopup, seedDaily, seedEvents, setup, stored } from './test/helpers';
import { eventColors } from './utils/color';

// 만들어 둔 일정을 보고(+N 더보기), 고치고, 지우는 동작을 확인하는 시험.
// 공통 도우미와 "오늘 = 2026-06-15" 고정은 src/test/helpers.jsx 참고.

setupTestEnvironment();

describe('+N 더보기', () => {
  const sameDay = '2026-01-05';
  const fourEvents = () => [
    makeEvent(1, '일정 하나', sameDay, sameDay, COLOR.blue),
    makeEvent(2, '일정 둘', sameDay, sameDay, COLOR.purple),
    makeEvent(3, '일정 셋', sameDay, sameDay, COLOR.pink),
    makeEvent(4, '일정 넷', sameDay, sameDay, COLOR.amber),
  ];

  it('한 칸에 보여줄 수 있는 3개까지는 "더보기"가 없다', () => {
    seedEvents(fourEvents().slice(0, 3));
    render(<App />);
    expect(within(cellOf(sameDay)).queryByText(/더보기/)).not.toBeInTheDocument();
    expect(within(cellOf(sameDay)).getByText('일정 셋')).toBeInTheDocument();
  });

  it('4개부터는 3개만 보이고 나머지 개수가 "+N 더보기"로 나타난다', () => {
    seedEvents(fourEvents());
    render(<App />);
    const cell = cellOf(sameDay);
    expect(within(cell).getByText('일정 셋')).toBeInTheDocument();
    expect(within(cell).queryByText('일정 넷')).not.toBeInTheDocument();
    expect(within(cell).getByText('+1 더보기')).toBeInTheDocument();
  });

  it('일정과 시간대 일정을 ("주요"가 아니어도) 합쳐서 센다', () => {
    seedEvents(fourEvents());
    seedDaily({ [sameDay]: [{ hour: 9, content: '평범한 일정', is_important: false, color: COLOR.blue }] });
    render(<App />);
    expect(within(cellOf(sameDay)).getByText('+2 더보기')).toBeInTheDocument();
  });

  it('"주요" 시간대 일정도 합쳐서 센다', () => {
    seedEvents(fourEvents());
    seedDaily({ [sameDay]: [{ hour: 9, content: '주요 회의', is_important: true, color: COLOR.purple }] });
    render(<App />);
    expect(within(cellOf(sameDay)).getByText('+2 더보기')).toBeInTheDocument();
  });

  it('"더보기"를 누르면 오른쪽 일정 패널이 열려 그날의 모든 일정이 나오고, X로 닫을 수 있다', async () => {
    seedEvents(fourEvents());
    seedDaily({ [sameDay]: [{ hour: 9, content: '주요 회의', is_important: true, color: COLOR.purple }] });
    const user = setup();
    await user.click(within(cellOf(sameDay)).getByText('+2 더보기'));

    const box = dayPanel();
    for (const title of ['일정 하나', '일정 둘', '일정 셋', '일정 넷']) {
      expect(barIn(box, title)).toBeInTheDocument();
    }
    expect(within(box).getByRole('button', { name: '09:00–10:00 주요 회의 (주요)' })).toBeInTheDocument(); // 시간표에 카드로 보인다
    expect(popupCount()).toBe(0); // 더보기 팝업은 없어졌다

    await user.click(buttonIn(box, '닫기'));
    expect(queryDayPanel()).toBeNull();
  });

  it('패널 위에 팝업이 겹쳐 뜰 때 나중에 연 팝업이 화면 구조에서도 뒤에 온다 (수정 → 삭제 확인 순)', async () => {
    seedEvents(fourEvents());
    const user = setup();
    await user.click(within(cellOf(sameDay)).getByText('+1 더보기'));
    await user.click(editIconOf(barIn(dayPanel(), '일정 넷')));
    await user.click(buttonIn(popup('일정 수정'), '삭제'));

    const names = [...document.querySelectorAll('[role="dialog"]')].map((d) => d.querySelector('[data-slot="dialog-title"]').textContent);
    expect(names).toEqual(['일정 수정', '일정 삭제']);
  });

  it('겹친 팝업의 맨 위를 닫으면 아래 팝업이 다시 입력되고, 팝업을 모두 닫으면 패널이 다시 눌린다', async () => {
    seedEvents(fourEvents());
    const user = setup();
    await user.click(within(cellOf(sameDay)).getByText('+1 더보기'));
    await user.click(editIconOf(barIn(dayPanel(), '일정 넷')));
    await user.click(buttonIn(popup('일정 수정'), '삭제'));
    await user.click(buttonIn(popup('일정 삭제'), '취소'));

    expect(popupCount()).toBe(1);
    await user.type(within(popup('일정 수정')).getByDisplayValue('일정 넷'), '!'); // 수정 팝업이 다시 입력된다
    expect(within(popup('일정 수정')).getByDisplayValue('일정 넷!')).toBeInTheDocument();
    await user.click(buttonIn(popup('일정 수정'), '취소'));
    expect(popupCount()).toBe(0);
    await user.click(buttonIn(dayPanel(), '닫기')); // 패널도 다시 눌린다
    expect(queryDayPanel()).toBeNull();
  });

  it('패널에서 연필로 일정을 고쳐 저장하면 패널 목록에도 바로 바뀐 이름이 보인다', async () => {
    seedEvents(fourEvents());
    const user = setup();
    await user.click(within(cellOf(sameDay)).getByText('+1 더보기'));
    await user.click(editIconOf(barIn(dayPanel(), '일정 넷')));
    const box = popup('일정 수정');
    await user.type(within(box).getByDisplayValue('일정 넷'), ' (고침)');
    await user.click(buttonIn(box, '변경 저장'));

    expect(popupCount()).toBe(0);
    expect(barIn(dayPanel(), '일정 넷 (고침)')).toBeInTheDocument();
  });
});

describe('일정 수정', () => {
  const openEdit = async (user, date, title) => {
    await user.click(editIconOf(barIn(cellOf(date), title)));
    return popup('일정 수정');
  };

  it('연필을 누르면 현재 이름·기간이 채워진 수정 팝업이 열린다', async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05', '2026-01-07', COLOR.purple)]);
    const user = setup();
    const box = await openEdit(user, '2026-01-05', '원래 이름');

    expect(within(box).getByDisplayValue('원래 이름')).toBeInTheDocument();
    const [start, end] = box.querySelectorAll('input[type="date"]');
    expect(start).toHaveValue('2026-01-05');
    expect(end).toHaveValue('2026-01-07');
  });

  it('이름·기간·색을 바꿔 저장하면 달력과 저장소에 반영되고 이전 날짜 칸에서는 사라진다', async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05', '2026-01-06', COLOR.blue)]);
    const user = setup();
    const box = await openEdit(user, '2026-01-05', '원래 이름');

    const nameInput = within(box).getByDisplayValue('원래 이름');
    await user.clear(nameInput);
    await user.type(nameInput, '바뀐 이름');
    const [start, end] = box.querySelectorAll('input[type="date"]');
    fireEvent.change(start, { target: { value: '2026-02-03' } });
    fireEvent.change(end, { target: { value: '2026-02-04' } });
    await user.click(colorButtonsIn(box)[3]); // 네 번째 색(앰버)
    await user.click(buttonIn(box, '변경 저장'));

    expect(queryPopup('일정 수정')).toBeNull();
    expect(within(cellOf('2026-01-05')).queryByText('원래 이름')).not.toBeInTheDocument();
    expect(within(cellOf('2026-01-05')).queryByText('바뀐 이름')).not.toBeInTheDocument();
    expect(barIn(cellOf('2026-02-03'), '바뀐 이름')).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.amber).background) });
    expect(within(cellOf('2026-02-04')).getByText('바뀐 이름')).toBeInTheDocument();
    expect(stored('planner_events')).toEqual([
      { id: 1, title: '바뀐 이름', start_date: '2026-02-03', end_date: '2026-02-04', color: COLOR.amber },
    ]);
  });

  it('이름을 비우고 저장하려 하면 경고를 보여 주고, 팝업은 열려 있으며 저장되지 않는다', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05')]);
    const user = setup();
    const box = await openEdit(user, '2026-01-05', '원래 이름');
    await user.clear(within(box).getByDisplayValue('원래 이름'));
    await user.click(buttonIn(box, '변경 저장'));

    expect(alertSpy).toHaveBeenCalledWith('일정명을 입력해주세요.');
    expect(queryPopup('일정 수정')).not.toBeNull();
    expect(stored('planner_events')[0].title).toBe('원래 이름');
  });

  it('취소하면 바꾼 내용을 버리고, 다시 열면 원래 값이 나온다', async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05')]);
    const user = setup();
    const box = await openEdit(user, '2026-01-05', '원래 이름');
    const nameInput = within(box).getByDisplayValue('원래 이름');
    await user.clear(nameInput);
    await user.type(nameInput, '버릴 이름');
    await user.click(buttonIn(box, '취소'));

    expect(queryPopup('일정 수정')).toBeNull();
    expect(within(cellOf('2026-01-05')).getByText('원래 이름')).toBeInTheDocument();
    const again = await openEdit(user, '2026-01-05', '원래 이름');
    expect(within(again).getByDisplayValue('원래 이름')).toBeInTheDocument();
  });

  it('같은 칸의 다른 일정은 건드리지 않는다', async () => {
    seedEvents([makeEvent(1, '수정할 일정', '2026-01-05'), makeEvent(2, '그대로인 일정', '2026-01-05')]);
    const user = setup();
    const box = await openEdit(user, '2026-01-05', '수정할 일정');
    const nameInput = within(box).getByDisplayValue('수정할 일정');
    await user.clear(nameInput);
    await user.type(nameInput, '수정됨');
    await user.click(buttonIn(box, '변경 저장'));

    const cell = cellOf('2026-01-05');
    expect(within(cell).getByText('수정됨')).toBeInTheDocument();
    expect(within(cell).getByText('그대로인 일정')).toBeInTheDocument();
  });

  it('예전 형식(소수) id로 저장된 일정도 수정할 수 있다', async () => {
    seedEvents([makeEvent(1794558320889.4521, '옛날 종일 일정', '2026-01-05')]);
    const user = setup();
    const box = await openEdit(user, '2026-01-05', '옛날 종일 일정');
    const nameInput = within(box).getByDisplayValue('옛날 종일 일정');
    await user.clear(nameInput);
    await user.type(nameInput, '고친 일정');
    await user.click(buttonIn(box, '변경 저장'));

    expect(within(cellOf('2026-01-05')).getByText('고친 일정')).toBeInTheDocument();
    expect(stored('planner_events')[0].id).toBe(1794558320889.4521);
  });
});

describe('일정 삭제', () => {
  it('수정 팝업의 "삭제"를 누르면 확인 팝업이 그 위에 열리고, 취소하면 일정이 그대로 남는다', async () => {
    seedEvents([makeEvent(1, '지울 일정', '2026-01-05')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '지울 일정')));
    await user.click(buttonIn(popup('일정 수정'), '삭제'));

    expect(popupCount()).toBe(2);
    await user.click(buttonIn(popup('일정 삭제'), '취소'));

    expect(queryPopup('일정 삭제')).toBeNull();
    expect(queryPopup('일정 수정')).not.toBeNull(); // 수정 팝업은 남아 있다
    expect(within(cellOf('2026-01-05')).getByText('지울 일정')).toBeInTheDocument();
  });

  it('확인하면 두 팝업이 모두 닫히고 일정이 달력과 저장소에서 사라진다', async () => {
    seedEvents([makeEvent(1, '지울 일정', '2026-01-05', '2026-01-06')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '지울 일정')));
    await user.click(buttonIn(popup('일정 수정'), '삭제'));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));

    expect(popupCount()).toBe(0);
    expect(within(cellOf('2026-01-05')).queryByText('지울 일정')).not.toBeInTheDocument();
    expect(within(cellOf('2026-01-06')).queryByText('지울 일정')).not.toBeInTheDocument();
    expect(stored('planner_events')).toEqual([]);
  });

  it('수정 팝업에서 일정을 지운 뒤, 다른 일정의 X를 눌러도 수정 팝업이 다시 나타나지 않는다', async () => {
    seedEvents([makeEvent(1, '먼저 지울 일정', '2026-01-05'), makeEvent(2, '나중에 지울 일정', '2026-01-06')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '먼저 지울 일정')));
    await user.click(buttonIn(popup('일정 수정'), '삭제'));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));
    expect(popupCount()).toBe(0);

    await user.click(deleteIconOf(barIn(cellOf('2026-01-06'), '나중에 지울 일정')));
    expect(queryPopup('일정 삭제')).not.toBeNull();
    expect(queryPopup('일정 수정')).toBeNull(); // 이전 수정 팝업의 "열림" 상태가 남아 있으면 여기서 같이 나타난다
    expect(popupCount()).toBe(1);
  });

  it('막대의 X 버튼을 누르면 수정 팝업 없이 바로 삭제 확인 팝업만 열린다', async () => {
    seedEvents([makeEvent(1, '지울 일정', '2026-01-05')]);
    const user = setup();
    await user.click(deleteIconOf(barIn(cellOf('2026-01-05'), '지울 일정')));

    expect(popupCount()).toBe(1);
    await user.click(buttonIn(popup('일정 삭제'), '확인'));
    expect(within(cellOf('2026-01-05')).queryByText('지울 일정')).not.toBeInTheDocument();
  });

  it('같은 칸의 다른 일정은 지워지지 않는다', async () => {
    seedEvents([makeEvent(1, '지울 일정', '2026-01-05'), makeEvent(2, '남을 일정', '2026-01-05')]);
    const user = setup();
    await user.click(deleteIconOf(barIn(cellOf('2026-01-05'), '지울 일정')));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));

    const cell = cellOf('2026-01-05');
    expect(within(cell).queryByText('지울 일정')).not.toBeInTheDocument();
    expect(within(cell).getByText('남을 일정')).toBeInTheDocument();
    expect(stored('planner_events').map((e) => e.title)).toEqual(['남을 일정']);
  });

  it('일정 패널 안에서 지울 수도 있다', async () => {
    seedEvents([
      makeEvent(1, '일정 하나', '2026-01-05'), makeEvent(2, '일정 둘', '2026-01-05'),
      makeEvent(3, '일정 셋', '2026-01-05'), makeEvent(4, '일정 넷', '2026-01-05'),
    ]);
    const user = setup();
    await user.click(within(cellOf('2026-01-05')).getByText('+1 더보기'));
    await user.click(deleteIconOf(barIn(dayPanel(), '일정 넷')));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));

    expect(stored('planner_events').map((e) => e.title)).toEqual(['일정 하나', '일정 둘', '일정 셋']);
    expect(within(cellOf('2026-01-05')).queryByText(/더보기/)).not.toBeInTheDocument(); // 이제 3개라서 더보기가 사라진다
  });

  it('예전 형식(소수) id로 저장된 일정도 지울 수 있다', async () => {
    seedEvents([makeEvent(1794558320889.4521, '옛날 종일 일정', '2026-01-05')]);
    const user = setup();
    await user.click(deleteIconOf(barIn(cellOf('2026-01-05'), '옛날 종일 일정')));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));

    expect(stored('planner_events')).toEqual([]);
  });
});

describe('팝업 버튼의 종류(모양)', () => {
  it('수정 팝업: 삭제는 약한 빨강(destructive), 취소는 secondary(파랑 2단계), 변경 저장은 primary', async () => {
    seedEvents([makeEvent(1, '버튼 모양 확인', '2026-01-05')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '버튼 모양 확인')));
    const box = popup('일정 수정');

    expect(buttonIn(box, '삭제')).toHaveClass('bg-destructive/10', 'text-destructive');
    expect(buttonIn(box, '취소')).toHaveClass('bg-secondary', 'text-secondary-foreground');
    expect(buttonIn(box, '변경 저장')).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('수정 팝업: 삭제는 왼쪽, 취소·변경 저장은 오른쪽으로 갈라 놓는다', async () => {
    seedEvents([makeEvent(1, '버튼 배치 확인', '2026-01-05')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '버튼 배치 확인')));
    const box = popup('일정 수정');

    expect(buttonIn(box, '삭제').parentElement).toHaveClass('sm:justify-between'); // 삭제가 들어 있는 버튼줄
    expect(buttonIn(box, '변경 저장').parentElement.parentElement).toBe(buttonIn(box, '삭제').parentElement); // 취소·변경 저장은 같은 줄의 오른쪽 묶음
    expect(buttonIn(box, '취소').parentElement).toBe(buttonIn(box, '변경 저장').parentElement);
  });

  it('삭제 확인 팝업도 다른 팝업과 같은 모양(모서리 xl, 여백 p-4)을 쓰고 너비만 더 좁다', async () => {
    seedEvents([makeEvent(1, '모양 확인', '2026-01-05')]);
    const user = setup();
    await user.click(editIconOf(barIn(cellOf('2026-01-05'), '모양 확인')));
    const edit = popup('일정 수정');
    await user.click(buttonIn(edit, '삭제'));
    const confirm = popup('일정 삭제');

    expect(confirm).toHaveClass('rounded-xl', 'p-4', 'bg-popover');
    expect(edit).toHaveClass('rounded-xl', 'p-4', 'bg-popover');
    expect(confirm).toHaveClass('sm:max-w-xs'); // 삭제 확인은 작은 확인창
    expect(edit).toHaveClass('sm:max-w-sm'); // 수정은 중간 너비
  });

  it('삭제 확인 팝업: 제목 아래 안내 문구가 있고 버튼줄은 오른쪽 정렬이다', async () => {
    seedEvents([makeEvent(1, '버튼 배치 확인', '2026-01-05')]);
    const user = setup();
    await user.click(deleteIconOf(barIn(cellOf('2026-01-05'), '버튼 배치 확인')));
    const box = popup('일정 삭제');

    expect(within(box).getByText('이 일정을 완전히 삭제하시겠습니까?')).toBeInTheDocument();
    expect(buttonIn(box, '확인').parentElement).toHaveClass('sm:justify-end');
  });

  it('삭제 확인 팝업: 취소는 secondary(파랑 2단계), 확인도 약한 빨강(destructive)이고 둘 다 다른 팝업의 버튼과 같은 크기다', async () => {
    seedEvents([makeEvent(1, '버튼 모양 확인', '2026-01-05')]);
    const user = setup();
    await user.click(deleteIconOf(barIn(cellOf('2026-01-05'), '버튼 모양 확인')));
    const box = popup('일정 삭제');

    expect(buttonIn(box, '취소')).toHaveClass('bg-secondary', 'text-secondary-foreground', 'h-8', 'rounded-lg');
    expect(buttonIn(box, '확인')).toHaveClass('bg-destructive/10', 'text-destructive', 'h-8', 'rounded-lg');
  });
});
