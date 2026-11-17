import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePlannerData from './usePlannerData';
import { addTodo, setTodoDone } from '../utils/todos';

// id는 "일정을 만든 순간의 시각"으로 만들어지므로, 시계를 고정해서 시험 결과가 매번 같게 한다.
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();

const eventData = (title, date = '2026-01-05') => ({
  title,
  start_date: date,
  end_date: date,
  color: '#3B82F6',
});

const saved = (key) => JSON.parse(localStorage.getItem(key));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('시작할 때의 값', () => {
  it('저장된 게 없으면 빈 목록 / 빈 객체로 시작한다', () => {
    const { result } = renderHook(() => usePlannerData());
    expect(result.current.events).toEqual([]);
    expect(result.current.timeBlocks).toEqual({});
  });

  it('저장된 값이 있으면 첫 화면부터 그 값으로 시작한다 (빈 상태를 거치지 않음)', () => {
    const events = [{ id: 1, ...eventData('저장된 일정') }];
    const blocks = { '2026-01-05': [{ id: 'a', start: '09:00', end: '10:00', content: '회의', is_important: true, color: '#22C55E' }] };
    localStorage.setItem('planner_events', JSON.stringify(events));
    localStorage.setItem('planner_time_blocks', JSON.stringify(blocks));

    const { result } = renderHook(() => usePlannerData());
    // renderHook 직후의 첫 값이다. 추가 렌더를 기다리지 않았다.
    expect(result.current.events).toEqual(events);
    expect(result.current.timeBlocks).toEqual(blocks);
  });

  it('깨진 저장 데이터는 무시하고 빈 값으로 시작한다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('planner_events', '{"broken": [');
    localStorage.setItem('planner_daily', 'not json');
    localStorage.setItem('planner_time_blocks', 'not json');
    const { result } = renderHook(() => usePlannerData());
    expect(result.current.events).toEqual([]);
    expect(result.current.timeBlocks).toEqual({});
  });

  it.each([
    ['문자열', '"hello"'],
    ['숫자 0', '0'],
    ['객체', '{"a":1}'],
    ['null', 'null'],
  ])('일정 목록이 올바른 JSON이지만 목록이 아니면(%s) 빈 목록으로 시작한다', (_이름, raw) => {
    localStorage.setItem('planner_events', raw);
    const { result } = renderHook(() => usePlannerData());
    expect(result.current.events).toEqual([]);
  });

  it.each([
    ['목록', '[1,2]'],
    ['숫자', '5'],
    ['문자열', '"x"'],
    ['null', 'null'],
  ])('시간 일정이 올바른 JSON이지만 객체가 아니면(%s) 빈 객체로 시작한다', (_이름, raw) => {
    localStorage.setItem('planner_time_blocks', raw);
    localStorage.setItem('planner_daily', raw);
    const { result } = renderHook(() => usePlannerData());
    expect(result.current.timeBlocks).toEqual({});
  });
});

describe('옛 모양(시간 칸) → 새 모양(카드) 자동 변환', () => {
  const oldDaily = {
    '2026-01-05': [
      { hour: 14, content: '미팅', is_important: false, color: '#3B82F6' },
      { hour: 9, content: '회의', is_important: true, color: '#22C55E' },
    ],
  };

  it('새 모양이 없고 옛 데이터가 있으면, 카드로 바꿔 시간순으로 보여 주고 새 이름표로 저장한다', () => {
    localStorage.setItem('planner_daily', JSON.stringify(oldDaily));
    const { result } = renderHook(() => usePlannerData());

    const day = result.current.timeBlocks['2026-01-05'];
    expect(day).toEqual([
      { id: expect.any(String), start: '09:00', end: '10:00', content: '회의', is_important: true, color: '#22C55E' },
      { id: expect.any(String), start: '14:00', end: '15:00', content: '미팅', is_important: false, color: '#3B82F6' },
    ]);
    expect(day[0].id).not.toBe(day[1].id);
    expect(saved('planner_time_blocks')).toEqual(result.current.timeBlocks);
  });

  it('옛 데이터는 지우지 않고 백업으로 남겨 둔다', () => {
    localStorage.setItem('planner_daily', JSON.stringify(oldDaily));
    renderHook(() => usePlannerData());
    expect(saved('planner_daily')).toEqual(oldDaily);
  });

  it('한 번 바꾼 뒤에는 다시 바꾸지 않는다 (다시 열어도 카드 id가 그대로)', () => {
    localStorage.setItem('planner_daily', JSON.stringify(oldDaily));
    const first = renderHook(() => usePlannerData()).result.current.timeBlocks;
    const second = renderHook(() => usePlannerData()).result.current.timeBlocks;
    expect(second).toEqual(first);
  });

  it('새 모양이 이미 있으면 옛 데이터는 무시한다', () => {
    const blocks = { '2026-01-06': [] };
    localStorage.setItem('planner_time_blocks', JSON.stringify(blocks));
    localStorage.setItem('planner_daily', JSON.stringify(oldDaily));
    const { result } = renderHook(() => usePlannerData());
    expect(result.current.timeBlocks).toEqual(blocks);
  });
});

describe('addEvent (일정 추가)', () => {
  it('id를 붙여 목록 맨 뒤에 추가하고 입력한 값은 그대로 둔다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('여름휴가', '2026-07-20')));

    expect(result.current.events).toEqual([{ ...eventData('여름휴가', '2026-07-20'), id: NOW }]);
  });

  it('이미 있는 일정 뒤에 추가한다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('첫째')));
    vi.setSystemTime(NOW + 5);
    act(() => result.current.addEvent(eventData('둘째')));

    expect(result.current.events.map((e) => e.title)).toEqual(['첫째', '둘째']);
    expect(result.current.events.map((e) => e.id)).toEqual([NOW, NOW + 5]);
  });

  it('추가한 내용이 저장소에도 저장된다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('저장 확인')));

    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events')).toEqual([{ ...eventData('저장 확인'), id: NOW }]);
  });

  it('저장소에 쓰지 못해도(예: 저장 공간 부족) 화면의 목록에는 추가된다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('저장 공간 부족');
    });
    const { result } = renderHook(() => usePlannerData());
    expect(() => act(() => result.current.addEvent(eventData('실패해도 계속')))).not.toThrow();
    expect(result.current.events.map((e) => e.title)).toEqual(['실패해도 계속']);
  });

  // 알려진 한계: addEvent는 호출 시점의 목록을 보고 새 목록을 만들기 때문에,
  // 한 번의 동작 안에서 두 번 부르면 첫 번째가 사라진다. 지금 앱은 저장 한 번에 한 번만 부르므로 문제가 드러나지 않는다.
  it.todo('한 번의 동작 안에서 두 번 추가해도 둘 다 남아야 한다');
});

describe('changeEvent (일정 수정)', () => {
  const setup = () => {
    localStorage.setItem(
      'planner_events',
      JSON.stringify([
        { id: 1, ...eventData('첫째') },
        { id: 2, ...eventData('둘째') },
        { id: 3, ...eventData('셋째') },
      ]),
    );
    return renderHook(() => usePlannerData());
  };

  it('id가 같은 일정만 교체하고 나머지는 그대로 둔다', () => {
    const { result } = setup();
    act(() => result.current.changeEvent({ id: 2, ...eventData('바뀐 둘째', '2026-02-02'), color: '#EF4444' }));

    expect(result.current.events).toEqual([
      { id: 1, ...eventData('첫째') },
      { id: 2, ...eventData('바뀐 둘째', '2026-02-02'), color: '#EF4444' },
      { id: 3, ...eventData('셋째') },
    ]);
  });

  it('수정한 내용이 저장소에도 저장된다', () => {
    const { result } = setup();
    act(() => result.current.changeEvent({ id: 1, ...eventData('저장될 이름') }));
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events')[0].title).toBe('저장될 이름');
  });

  it('없는 id로 수정하면 목록이 달라지지 않는다', () => {
    const { result } = setup();
    const before = result.current.events;
    act(() => result.current.changeEvent({ id: 999, ...eventData('없는 일정') }));
    expect(result.current.events).toEqual(before);
  });
});

describe('removeEvent (일정 삭제)', () => {
  const setup = () => {
    localStorage.setItem(
      'planner_events',
      JSON.stringify([
        { id: 1, ...eventData('첫째') },
        { id: 2, ...eventData('둘째') },
      ]),
    );
    return renderHook(() => usePlannerData());
  };

  it('id가 같은 일정만 지운다', () => {
    const { result } = setup();
    act(() => result.current.removeEvent(1));
    expect(result.current.events.map((e) => e.title)).toEqual(['둘째']);
  });

  it('삭제한 결과가 저장소에도 반영된다', () => {
    const { result } = setup();
    act(() => result.current.removeEvent(2));
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events').map((e) => e.title)).toEqual(['첫째']);
  });

  it('없는 id를 지우려 해도 목록이 달라지지 않는다', () => {
    const { result } = setup();
    act(() => result.current.removeEvent(999));
    expect(result.current.events).toHaveLength(2);
  });
});

describe('patchEvent · changeEventTodos (기간 일정 일부 고치기·할 일)', () => {
  it('patchEvent: 바꾼 값만 덮어쓰고 나머지(기간·색 등)는 그대로 둔다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('워크숍')));
    const { id } = result.current.events[0];
    act(() => result.current.patchEvent(id, { title: '여름 워크숍' }));
    expect(result.current.events[0]).toEqual({ ...eventData('여름 워크숍'), id });
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events')[0].title).toBe('여름 워크숍');
  });

  it('changeEventTodos: 할 일이 없던(예전) 일정에도 더하고, 연달아 고쳐도 앞의 변경이 남는다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('워크숍')));
    const { id } = result.current.events[0];
    act(() => {
      result.current.changeEventTodos(id, (todos) => addTodo(todos, '장소 예약'));
      result.current.changeEventTodos(id, (todos) => addTodo(todos, '자료 준비'));
      result.current.changeEventTodos(id, (todos) => setTodoDone(todos, todos[0].id, true));
      result.current.patchEvent(id, { color: '#FDCA59' });
    });
    expect(result.current.events[0].todos.map((t) => [t.text, t.done])).toEqual([['장소 예약', true], ['자료 준비', false]]);
    expect(result.current.events[0].color).toBe('#FDCA59');
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events')[0].todos).toHaveLength(2);
  });

  it('다른 일정은 건드리지 않는다', () => {
    const one = { ...eventData('하나'), id: 1 };
    const two = { ...eventData('둘'), id: 2, todos: [{ id: 'x', text: '그대로', done: false }] };
    localStorage.setItem('planner_events', JSON.stringify([one, two]));
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.changeEventTodos(1, (todos) => addTodo(todos, '새 할 일')));
    act(() => result.current.patchEvent(1, { title: '하나 (고침)' }));
    expect(result.current.events[0]).toEqual({ ...one, title: '하나 (고침)', todos: [expect.objectContaining({ text: '새 할 일' })] });
    expect(result.current.events[1]).toEqual(two);
  });
});

describe('옛 형식의 id (소수)로 저장된 일정', () => {
  // 예전에는 종일 일정의 id를 Date.now() + Math.random()으로 만들어서 소수였다. 이미 저장된 데이터도 계속 다룰 수 있어야 한다.
  const OLD_ID = 1794558320889.4521;
  const setup = () => {
    localStorage.setItem('planner_events', JSON.stringify([{ id: OLD_ID, ...eventData('옛날 종일') }]));
    return renderHook(() => usePlannerData());
  };

  it('수정할 수 있다', () => {
    const { result } = setup();
    act(() => result.current.changeEvent({ id: OLD_ID, ...eventData('수정됨') }));
    expect(result.current.events[0].title).toBe('수정됨');
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events')[0].id).toBe(OLD_ID); // 저장소를 거쳐도 id가 정확히 보존된다
  });

  it('삭제할 수 있다', () => {
    const { result } = setup();
    act(() => result.current.removeEvent(OLD_ID));
    expect(result.current.events).toEqual([]);
  });
});

describe('saveDayBlocks (날짜별 시간 일정 카드 저장)', () => {
  const nine = { id: 'n', start: '09:00', end: '10:00', content: '회의', is_important: true, color: '#22C55E' };
  const ten = { id: 't', start: '10:00', end: '11:00', content: '운동', is_important: false, color: '#3B82F6' };

  it('그 날짜 아래에 저장하고 저장소에도 반영한다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [nine, ten]));

    expect(result.current.timeBlocks).toEqual({ '2026-01-05': [nine, ten] });
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_time_blocks')).toEqual({ '2026-01-05': [nine, ten] });
  });

  it('다른 날짜의 일정은 건드리지 않는다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [nine]));
    act(() => result.current.saveDayBlocks('2026-01-06', [ten]));

    expect(result.current.timeBlocks).toEqual({ '2026-01-05': [nine], '2026-01-06': [ten] });
  });

  it('같은 날짜에 다시 저장하면 이전 내용을 통째로 덮어쓴다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [nine, ten]));
    act(() => result.current.saveDayBlocks('2026-01-05', [ten]));

    expect(result.current.timeBlocks['2026-01-05']).toEqual([ten]);
  });

  it('빈 목록으로 저장하면 그 날짜는 빈 목록이 된다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [nine]));
    act(() => result.current.saveDayBlocks('2026-01-05', []));
    expect(result.current.timeBlocks['2026-01-05']).toEqual([]);
  });
});

describe('카드 하나씩 다루기 (addTimeBlock · changeTimeBlock · removeTimeBlock · removeTimeBlockIfEmpty)', () => {
  const nine = { id: 'n', start: '09:00', end: '10:00', content: '회의', is_important: false, color: '#22C55E' };
  const eight = { id: 'e', start: '08:00', end: '08:30', content: '', is_important: false, color: '#3B82F6' };

  it('addTimeBlock: 카드를 더하고 시작 시각 순서로 정렬해 저장한다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addTimeBlock('2026-01-05', nine));
    act(() => result.current.addTimeBlock('2026-01-05', eight));
    expect(result.current.timeBlocks['2026-01-05'].map((b) => b.id)).toEqual(['e', 'n']);
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_time_blocks')['2026-01-05'].map((b) => b.id)).toEqual(['e', 'n']);
  });

  it('changeTimeBlock: 바꾼 값만 덮어쓰고 id와 나머지는 그대로 둔다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addTimeBlock('2026-01-05', nine));
    act(() => result.current.changeTimeBlock('2026-01-05', 'n', { content: '팀 회의', is_important: true }));
    expect(result.current.timeBlocks['2026-01-05']).toEqual([{ ...nine, content: '팀 회의', is_important: true }]);
  });

  it('한 번에 연달아 고쳐도(추가 → 수정) 앞의 저장이 사라지지 않는다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => {
      result.current.addTimeBlock('2026-01-05', eight);
      result.current.changeTimeBlock('2026-01-05', 'e', { content: '아침 운동' });
    });
    expect(result.current.timeBlocks['2026-01-05']).toEqual([{ ...eight, content: '아침 운동' }]);
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_time_blocks')['2026-01-05'][0].content).toBe('아침 운동');
  });

  it('removeTimeBlock: id가 같은 카드만 지운다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [eight, nine]));
    act(() => result.current.removeTimeBlock('2026-01-05', 'e'));
    expect(result.current.timeBlocks['2026-01-05']).toEqual([nine]);
  });

  it('removeTimeBlockIfEmpty: 이름이 빈(공백뿐인) 카드만 지우고, 이름이 있으면 남긴다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [{ ...eight, content: '  ' }, nine]));
    act(() => result.current.removeTimeBlockIfEmpty('2026-01-05', 'n'));
    act(() => result.current.removeTimeBlockIfEmpty('2026-01-05', 'e'));
    expect(result.current.timeBlocks['2026-01-05']).toEqual([nine]);
  });
});

describe('changeTodos (카드의 할 일 목록 고치기)', () => {
  const nine = { id: 'n', start: '09:00', end: '10:00', content: '회의', is_important: false, color: '#22C55E' };

  it('할 일이 없던 카드(예전 카드)에도 더할 수 있고, 저장소에도 반영된다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addTimeBlock('2026-01-05', nine));
    act(() => result.current.changeTodos('2026-01-05', 'n', (todos) => addTodo(todos, '자료 출력')));
    expect(result.current.timeBlocks['2026-01-05'][0].todos).toEqual([{ id: expect.any(String), text: '자료 출력', done: false }]);
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_time_blocks')['2026-01-05'][0].todos.map((t) => t.text)).toEqual(['자료 출력']);
  });

  it('빠르게 연달아 고쳐도(추가 → 추가 → 완료) 앞의 변경이 사라지지 않는다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addTimeBlock('2026-01-05', nine));
    act(() => {
      result.current.changeTodos('2026-01-05', 'n', (todos) => addTodo(todos, '하나'));
      result.current.changeTodos('2026-01-05', 'n', (todos) => addTodo(todos, '둘'));
      result.current.changeTodos('2026-01-05', 'n', (todos) => setTodoDone(todos, todos[0].id, true));
    });
    expect(result.current.timeBlocks['2026-01-05'][0].todos.map((t) => [t.text, t.done])).toEqual([['하나', true], ['둘', false]]);
  });

  it('다른 카드의 할 일과 카드의 다른 값(이름·시각)은 건드리지 않는다', () => {
    const ten = { ...nine, id: 't', start: '10:00', end: '11:00', todos: [{ id: 'x', text: '그대로', done: false }] };
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [nine, ten]));
    act(() => result.current.changeTodos('2026-01-05', 'n', (todos) => addTodo(todos, '새 할 일')));
    const [first, second] = result.current.timeBlocks['2026-01-05'];
    expect(first).toEqual({ ...nine, todos: [expect.objectContaining({ text: '새 할 일' })] });
    expect(second).toEqual(ten);
  });

  it('removeTimeBlockIfEmpty: 이름이 비어도 할 일이 있으면 남기고, 이름도 할 일도 없으면 지운다', () => {
    const noName = { ...nine, id: 'a', content: '' };
    const noNameWithTodo = { ...nine, id: 'b', start: '11:00', end: '12:00', content: '', todos: [{ id: 'x', text: '전화', done: false }] };
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.saveDayBlocks('2026-01-05', [noName, noNameWithTodo]));
    act(() => result.current.removeTimeBlockIfEmpty('2026-01-05', 'a'));
    act(() => result.current.removeTimeBlockIfEmpty('2026-01-05', 'b'));
    expect(result.current.timeBlocks['2026-01-05'].map((b) => b.id)).toEqual(['b']);
  });
});

describe('일정과 시간 일정을 한 번에 저장하는 경우', () => {
  it('서로 다른 데이터라서 둘 다 정상적으로 저장된다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => {
      result.current.addEvent(eventData('종일 일정'));
      result.current.saveDayBlocks('2026-01-05', [{ id: 'n', start: '09:00', end: '10:00', content: '회의', is_important: true, color: '#22C55E' }]);
    });

    expect(result.current.events.map((e) => e.title)).toEqual(['종일 일정']);
    expect(result.current.timeBlocks['2026-01-05']).toHaveLength(1);
    act(() => result.current.save()); // 저장 버튼을 눌러야 저장소에 쓴다
    expect(saved('planner_events')).toHaveLength(1);
    expect(saved('planner_time_blocks')['2026-01-05']).toHaveLength(1);
  });
});

describe('저장 버튼으로만 저장 (저장된 것 / 고치는 중인 것)', () => {
  it('고치기만 하면 저장소와 "저장된 것"은 그대로이고, 고치는 중인 것만 바뀐다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('아직 저장 안 함')));
    act(() => result.current.addTimeBlock('2026-01-05', { id: 'a', start: '09:00', end: '10:00', content: '회의', is_important: false, color: '#8DA5FD' }));
    expect(result.current.events.map((e) => e.title)).toEqual(['아직 저장 안 함']);
    expect(result.current.savedEvents).toEqual([]);
    expect(result.current.savedTimeBlocks).toEqual({});
    expect(localStorage.getItem('planner_events')).toBeNull();
    expect(localStorage.getItem('planner_time_blocks')).toBeNull();
    expect(result.current.changeCount).toBe(2);
  });

  it('save()를 부르면 저장소에 쓰고 "저장된 것"도 같아지며, 변경 개수는 0이 된다', () => {
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.addEvent(eventData('저장할 일정')));
    act(() => result.current.save());
    expect(saved('planner_events').map((e) => e.title)).toEqual(['저장할 일정']);
    expect(result.current.savedEvents).toEqual(result.current.events);
    expect(result.current.changeCount).toBe(0);
  });

  it('revert()는 고치던 것을 버리고 마지막으로 저장한 상태로 돌아간다', () => {
    localStorage.setItem('planner_events', JSON.stringify([{ id: 1, ...eventData('원래 이름') }]));
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.patchEvent(1, { title: '고친 이름' }));
    act(() => result.current.addEvent(eventData('새 일정')));
    expect(result.current.changeCount).toBe(2);
    act(() => result.current.revert());
    expect(result.current.events).toEqual([{ id: 1, ...eventData('원래 이름') }]);
    expect(result.current.changeCount).toBe(0);
  });

  it('commit 함수(새 일정 패널 저장, 삭제 확인)는 그 일정만 바로 저장하고, 고치던 다른 변경은 저장하지 않는다', () => {
    localStorage.setItem('planner_events', JSON.stringify([{ id: 1, ...eventData('원래 이름') }, { id: 2, ...eventData('지울 일정') }]));
    const { result } = renderHook(() => usePlannerData());
    act(() => result.current.patchEvent(1, { title: '고친 이름' })); // 저장 안 한 변경
    act(() => result.current.commitAddEvent(eventData('바로 저장')));
    act(() => result.current.commitRemoveEvent(2));
    act(() => result.current.commitAddTimeBlock('2026-01-05', { id: 'a', start: '09:00', end: '10:00', content: '회의', is_important: false, color: '#8DA5FD' }));
    expect(saved('planner_events').map((e) => e.title)).toEqual(['원래 이름', '바로 저장']);
    expect(saved('planner_time_blocks')['2026-01-05'].map((b) => b.id)).toEqual(['a']);
    expect(result.current.events.map((e) => e.title)).toEqual(['고친 이름', '바로 저장']); // 고치던 것은 그대로 남는다
    expect(result.current.changeCount).toBe(1);
  });
});
