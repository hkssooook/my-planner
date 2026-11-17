import { describe, it, expect } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import App from './App';
import { setupTestEnvironment, saveChanges, COLOR, barIn, blockPanel, buttonIn, cellOf, dayButtonOf, dayPanel, eventPanel, newPanel, hexToRgb, makeEvent, popup, popupCount, queryBlockPanel, queryDayPanel, queryEventPanel, queryPopup, seedDaily, seedEvents, setup, stored } from './test/helpers';
import { eventColors } from './utils/color';

// 만들어 둔 일정을 보고(+N 더보기), 기간 일정 상세 패널에서 고치고, 지우는 동작을 확인하는 시험.
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
    expect(within(box).getByRole('button', { name: '주요 회의 09:00–10:00 (주요)' })).toBeInTheDocument(); // 시간 일정도 같은 목록에 보인다
    expect(popupCount()).toBe(0); // 더보기 팝업은 없어졌다

    await user.click(buttonIn(box, '닫기'));
    expect(queryDayPanel()).toBeNull();
  });

});

// 달력 막대를 눌러 기간 일정 상세 패널을 연다
const openEvent = async (user, date, title) => {
  await user.click(within(cellOf(date)).getByText(title));
  return eventPanel();
};

describe('기간 일정 상세 패널', () => {
  it('이름·기간·색을 바꾸고 저장을 누르면 달력과 저장소에 반영되고, 이전 날짜 칸에서는 사라진다', async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05', '2026-01-06', COLOR.blue)]);
    const user = setup();
    const box = await openEvent(user, '2026-01-05', '원래 이름');

    const nameInput = within(box).getByLabelText('이름');
    await user.clear(nameInput);
    await user.type(nameInput, '바뀐 이름');
    fireEvent.change(within(box).getByLabelText('종료일'), { target: { value: '2026-02-04' } });
    fireEvent.change(within(box).getByLabelText('시작일'), { target: { value: '2026-02-03' } });
    await user.click(within(within(box).getByRole('group', { name: '기간 일정 색' })).getByRole('button', { name: '앰버' }));

    expect(within(box).getByTestId('save-bar')).toHaveTextContent('저장 안 한 변경 1개'); // 두 번째 패널에도 저장 줄이 있다
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(within(cellOf('2026-01-05')).queryByText('바뀐 이름')).not.toBeInTheDocument();
    expect(barIn(cellOf('2026-02-03'), '바뀐 이름')).toHaveStyle({ backgroundColor: hexToRgb(eventColors(COLOR.amber).background) });
    expect(within(cellOf('2026-02-04')).getByText('바뀐 이름')).toBeInTheDocument();
    expect(stored('planner_events')).toEqual([
      { id: 1, title: '바뀐 이름', start_date: '2026-02-03', end_date: '2026-02-04', color: COLOR.amber },
    ]);
    expect(within(box).getByText('2/3–2/4 · 2일')).toBeInTheDocument();
  });

  it('시작일을 종료일보다 뒤로 고르면 종료일이 따라오고, 종료일을 시작일보다 앞으로 고르면 시작일이 따라온다', async () => {
    seedEvents([makeEvent(1, '기간', '2026-01-05', '2026-01-07')]);
    const user = setup();
    const box = await openEvent(user, '2026-01-05', '기간');
    fireEvent.change(within(box).getByLabelText('시작일'), { target: { value: '2026-01-10' } });
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_events')[0]).toEqual(expect.objectContaining({ start_date: '2026-01-10', end_date: '2026-01-10' }));
    fireEvent.change(within(box).getByLabelText('종료일'), { target: { value: '2026-01-08' } });
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_events')[0]).toEqual(expect.objectContaining({ start_date: '2026-01-08', end_date: '2026-01-08' }));
  });

  it('이름을 다 지운 채 닫으면 패널을 열 때의 이름으로 되돌린다 (✕·Esc 모두)', async () => {
    seedEvents([makeEvent(1, '지키는 이름', '2026-01-05')]);
    const user = setup();
    let box = await openEvent(user, '2026-01-05', '지키는 이름');
    await user.clear(within(box).getByLabelText('이름'));
    await user.click(buttonIn(box, '기간 일정 상세 닫기'));
    expect(queryEventPanel()).toBeNull();
    expect(stored('planner_events')[0].title).toBe('지키는 이름');

    box = await openEvent(user, '2026-01-05', '지키는 이름');
    await user.clear(within(box).getByLabelText('이름'));
    await user.keyboard('{Escape}');
    expect(queryEventPanel()).toBeNull();
    expect(within(cellOf('2026-01-05')).getByText('지키는 이름')).toBeInTheDocument();
  });

  it('같은 칸의 다른 일정은 건드리지 않는다', async () => {
    seedEvents([makeEvent(1, '고칠 일정', '2026-01-05'), makeEvent(2, '그대로 둘 일정', '2026-01-05', '2026-01-05', COLOR.mint)]);
    const user = setup();
    const box = await openEvent(user, '2026-01-05', '고칠 일정');
    await user.type(within(box).getByLabelText('이름'), ' (고침)');
    expect(stored('planner_events')[1]).toEqual(makeEvent(2, '그대로 둘 일정', '2026-01-05', '2026-01-05', COLOR.mint));
    expect(barIn(dayPanel(), '고칠 일정 (고침)')).toBeInTheDocument(); // 패널 목록에도 바로 바뀐 이름
  });

  it('할 일을 적을 수 있고, 그 일정에 저장된다', async () => {
    seedEvents([makeEvent(1, '워크숍', '2026-01-05', '2026-01-07')]);
    const user = setup();
    const box = await openEvent(user, '2026-01-06', '워크숍');
    await user.type(within(box).getByRole('textbox', { name: '새 할 일' }), '장소 예약{Enter}자료 준비{Enter}');
    await user.click(within(box).getByRole('checkbox', { name: '장소 예약 완료' }));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_events')[0].todos.map((t) => [t.text, t.done])).toEqual([['장소 예약', true], ['자료 준비', false]]);
    expect(within(box).getByLabelText('2개 중 1개 완료')).toHaveTextContent('1 / 2');
  });

  it('오른쪽 상세 패널은 하나만: 기간 일정을 열다가 시간 카드를 누르면 카드 상세로 바뀌고, 반대도 같다', async () => {
    seedEvents([makeEvent(1, '워크숍', '2026-01-05')]);
    seedDaily({ '2026-01-05': [{ hour: 9, content: '회의', is_important: false, color: COLOR.blue }] });
    const user = setup();
    await openEvent(user, '2026-01-05', '워크숍');
    await user.click(within(dayPanel()).getByRole('button', { name: /^회의 09:00/ }));
    expect(queryEventPanel()).toBeNull();
    expect(blockPanel()).toBeInTheDocument();
    await user.click(within(dayPanel()).getByRole('button', { name: /^워크숍/ }));
    expect(queryBlockPanel()).toBeNull();
    expect(eventPanel()).toBeInTheDocument();
  });

  it('다음 날로 넘기거나 일정 패널을 닫으면 기간 일정 상세 패널도 닫힌다', async () => {
    seedEvents([makeEvent(1, '워크숍', '2026-01-05', '2026-01-07')]);
    const user = setup();
    await openEvent(user, '2026-01-05', '워크숍');
    await user.click(buttonIn(dayPanel(), '다음 날'));
    expect(queryEventPanel()).toBeNull();
    await user.click(within(dayPanel()).getByRole('button', { name: /^워크숍/ }));
    await user.click(buttonIn(dayPanel(), '닫기'));
    expect(queryEventPanel()).toBeNull();
  });

  it('예전 형식(소수) id로 저장된 일정도 고치고 지울 수 있다', async () => {
    seedEvents([makeEvent(1794558320889.4521, '옛날 종일 일정', '2026-01-05')]);
    const user = setup();
    const box = await openEvent(user, '2026-01-05', '옛날 종일 일정');
    await user.type(within(box).getByLabelText('이름'), ' (고침)');
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_events')[0]).toEqual(expect.objectContaining({ id: 1794558320889.4521, title: '옛날 종일 일정 (고침)' }));
    await user.click(buttonIn(box, '이 기간 일정 삭제'));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));
    await saveChanges(user); // 저장을 눌러야 저장소·달력에 반영된다
    expect(stored('planner_events')).toEqual([]);
  });
});

describe('기간 일정 삭제 (확인 팝업)', () => {
  it('패널의 "삭제"를 누르면 확인 팝업이 열리고, 취소하면 일정과 패널이 그대로 남는다', async () => {
    seedEvents([makeEvent(1, '지울 일정', '2026-01-05')]);
    const user = setup();
    const box = await openEvent(user, '2026-01-05', '지울 일정');
    await user.click(buttonIn(box, '이 기간 일정 삭제'));
    expect(popup('일정 삭제')).toBeInTheDocument();
    await user.click(buttonIn(popup('일정 삭제'), '취소'));
    expect(queryPopup('일정 삭제')).toBeNull();
    expect(eventPanel()).toBeInTheDocument();
    expect(stored('planner_events')).toHaveLength(1);
  });

  it('확인하면 일정이 달력·패널 목록·저장소에서 사라지고 상세 패널도 닫히며, 같은 칸의 다른 일정은 남는다', async () => {
    seedEvents([makeEvent(1, '지울 일정', '2026-01-05'), makeEvent(2, '남길 일정', '2026-01-05')]);
    const user = setup();
    const box = await openEvent(user, '2026-01-05', '지울 일정');
    await user.click(buttonIn(box, '이 기간 일정 삭제'));
    await user.click(buttonIn(popup('일정 삭제'), '확인'));
    expect(popupCount()).toBe(0);
    expect(queryEventPanel()).toBeNull();
    expect(within(cellOf('2026-01-05')).queryByText('지울 일정')).toBeNull();
    expect(within(dayPanel()).queryByText('지울 일정')).toBeNull();
    expect(stored('planner_events').map((e) => e.title)).toEqual(['남길 일정']);
  });

  it('확인 팝업은 다른 팝업과 같은 모양(모서리 xl, 여백 p-4)에 작은 너비이고, 안내 문구와 오른쪽 정렬 버튼줄이 있다', async () => {
    seedEvents([makeEvent(1, '모양 확인', '2026-01-05')]);
    const user = setup();
    await user.click(buttonIn(await openEvent(user, '2026-01-05', '모양 확인'), '이 기간 일정 삭제'));
    const confirm = popup('일정 삭제');
    expect(confirm).toHaveClass('rounded-xl', 'p-4', 'bg-popover', 'sm:max-w-xs');
    expect(within(confirm).getByText('이 일정을 완전히 삭제하시겠습니까?')).toBeInTheDocument();
    expect(buttonIn(confirm, '확인').parentElement).toHaveClass('sm:justify-end');
  });

  it('확인 팝업: 취소는 secondary(파랑 2단계), 확인은 약한 빨강(destructive)이고 둘 다 같은 크기다', async () => {
    seedEvents([makeEvent(1, '버튼 모양 확인', '2026-01-05')]);
    const user = setup();
    await user.click(buttonIn(await openEvent(user, '2026-01-05', '버튼 모양 확인'), '이 기간 일정 삭제'));
    const box = popup('일정 삭제');
    expect(buttonIn(box, '취소')).toHaveClass('bg-secondary', 'text-secondary-foreground', 'h-8', 'rounded-lg');
    expect(buttonIn(box, '확인')).toHaveClass('bg-destructive/10', 'text-destructive', 'h-8', 'rounded-lg');
  });
});

describe('저장 줄 (저장 버튼을 눌러야만 저장)', () => {
  const bar = () => within(dayPanel()).getByTestId('save-bar'); // 일정 패널의 저장 줄

  it('처음에는 "모두 저장됨"이고, 고치면 "저장 안 한 변경 n개"와 [되돌리기] [저장]이 나온다. 저장 전에는 달력과 저장소가 그대로다', async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05')]);
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    expect(bar()).toHaveTextContent('모두 저장됨');
    expect(within(bar()).getByRole('button', { name: '저장됨' })).toBeDisabled();

    await user.click(within(dayPanel()).getByRole('button', { name: /^원래 이름/ }));
    const title = within(eventPanel()).getByLabelText('이름');
    await user.clear(title);
    await user.type(title, '새 이름');
    expect(bar()).toHaveTextContent('저장 안 한 변경 1개');
    expect(within(cellOf('2026-01-05')).getByText('원래 이름')).toBeInTheDocument(); // 달력은 저장된 것
    expect(stored('planner_events')[0].title).toBe('원래 이름');
    expect(within(dayPanel()).getByRole('button', { name: /^새 이름/ })).toBeInTheDocument(); // 패널은 고치는 중인 것

    await user.click(within(bar()).getByRole('button', { name: '저장' }));
    expect(bar()).toHaveTextContent('모두 저장됨');
    expect(within(cellOf('2026-01-05')).getByText('새 이름')).toBeInTheDocument();
    expect(stored('planner_events')[0].title).toBe('새 이름');
  });

  it('[되돌리기]는 고치던 것을 모두 버리고 마지막으로 저장한 상태로 돌아간다', async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05')]);
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(within(dayPanel()).getByRole('button', { name: /^원래 이름/ }));
    await user.type(within(eventPanel()).getByLabelText('이름'), ' 고침');
    await user.click(within(dayPanel()).getByRole('button', { name: '+ 일정 더하기' }));
    await user.click(within(newPanel()).getByRole('button', { name: '취소' }));
    expect(bar()).toHaveTextContent('저장 안 한 변경 1개');

    await user.click(within(bar()).getByRole('button', { name: '되돌리기' }));
    expect(bar()).toHaveTextContent('모두 저장됨');
    expect(within(dayPanel()).getByRole('button', { name: /^원래 이름/ })).toBeInTheDocument();
    expect(stored('planner_events')[0].title).toBe('원래 이름');
  });

  it('할 일 체크도 저장을 눌러야 저장된다', async () => {
    seedEvents([{ ...makeEvent(1, '준비', '2026-01-05'), todos: [{ id: 't', text: '자료', done: false }] }]);
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(within(dayPanel()).getByRole('checkbox', { name: /자료/ }));
    expect(stored('planner_events')[0].todos[0].done).toBe(false);
    expect(bar()).toHaveTextContent('저장 안 한 변경 1개');
    await user.click(within(bar()).getByRole('button', { name: '저장' }));
    expect(stored('planner_events')[0].todos[0].done).toBe(true);
  });
});

describe('저장 안 한 변경 알림 (노란 점 · 두 번째 패널 저장 줄 · 닫을 때 묻기 · 창 닫을 때 경고)', () => {
  // 1월 5일 패널을 열고 기간 일정 이름을 고쳐 "저장 안 한 변경 1개"를 만든다
  const editOne = async () => {
    seedEvents([makeEvent(1, '원래 이름', '2026-01-05')]);
    const user = setup();
    await user.click(dayButtonOf('2026-01-05'));
    await user.click(within(dayPanel()).getByRole('button', { name: /^원래 이름/ }));
    await user.type(within(eventPanel()).getByLabelText('이름'), ' 고침');
    return user;
  };
  const closeX = (user) => user.click(within(dayPanel()).getByRole('button', { name: '닫기' }));

  it('저장 안 한 변경이 있으면 일정 패널 머리의 날짜 옆에 노란 점이 찍히고, 저장하면 사라진다', async () => {
    const user = await editOne();
    expect(within(dayPanel()).getByRole('img', { name: '저장 안 한 변경 있음' })).toHaveClass('bg-warning');
    await saveChanges(user);
    expect(within(dayPanel()).queryByRole('img', { name: '저장 안 한 변경 있음' })).toBeNull();
  });

  it('두 번째 패널(기간 일정)에도 같은 저장 줄이 있고, 거기서 저장해도 된다', async () => {
    const user = await editOne();
    const bar = within(eventPanel()).getByTestId('save-bar');
    expect(bar).toHaveTextContent('저장 안 한 변경 1개');
    await user.click(within(bar).getByRole('button', { name: '저장' }));
    expect(stored('planner_events')[0].title).toBe('원래 이름 고침');
    expect(within(dayPanel()).getByTestId('save-bar')).toHaveTextContent('모두 저장됨');
  });

  it('저장 안 한 채 X로 닫으면 묻는다: [취소]는 그대로 두고, [버리고 닫기]는 버리고 닫는다', async () => {
    const user = await editOne();
    await closeX(user);
    expect(popup('저장하지 않은 변경이 있어요')).toHaveTextContent('저장 안 한 변경 1개');
    await user.click(buttonIn(popup('저장하지 않은 변경이 있어요'), '취소'));
    expect(queryPopup('저장하지 않은 변경이 있어요')).toBeNull();
    expect(dayPanel()).toBeInTheDocument();

    await closeX(user);
    await user.click(buttonIn(popup('저장하지 않은 변경이 있어요'), '버리고 닫기'));
    expect(queryDayPanel()).toBeNull();
    expect(stored('planner_events')[0].title).toBe('원래 이름');
    await user.click(dayButtonOf('2026-01-05'));
    expect(within(dayPanel()).getByTestId('save-bar')).toHaveTextContent('모두 저장됨'); // 버린 변경은 남지 않는다
  });

  it('[저장하고 닫기]는 저장한 뒤 닫는다', async () => {
    const user = await editOne();
    await closeX(user);
    await user.click(buttonIn(popup('저장하지 않은 변경이 있어요'), '저장하고 닫기'));
    expect(queryDayPanel()).toBeNull();
    expect(stored('planner_events')[0].title).toBe('원래 이름 고침');
    expect(within(cellOf('2026-01-05')).getByText('원래 이름 고침')).toBeInTheDocument();
  });

  it('바뀐 것이 없으면 묻지 않고 바로 닫는다. 날짜를 옮길 때는 묻지 않고 고치던 내용이 그대로 남는다', async () => {
    const user = await editOne();
    await user.click(within(dayPanel()).getByRole('button', { name: '다음 날' }));
    expect(queryPopup('저장하지 않은 변경이 있어요')).toBeNull();
    expect(within(dayPanel()).getByTestId('save-bar')).toHaveTextContent('저장 안 한 변경 1개');
    await saveChanges(user);
    await closeX(user);
    expect(queryPopup('저장하지 않은 변경이 있어요')).toBeNull();
    expect(queryDayPanel()).toBeNull();
  });

  it('저장 안 한 변경이 있으면 창을 닫거나 새로 고칠 때 브라우저가 경고한다', async () => {
    const user = await editOne();
    const leave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    await saveChanges(user);
    const leaveAfterSave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leaveAfterSave);
    expect(leaveAfterSave.defaultPrevented).toBe(false);
  });
});
