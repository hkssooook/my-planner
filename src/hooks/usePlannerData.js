import { useState } from 'react';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';
import { migrateDailyToBlocks, sortBlocks } from '../utils/timeBlocks';
import { todosOf } from '../utils/todos';
import { countChanges } from '../utils/changes';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

// 저장된 값이 기대한 모양(목록 / 일반 객체)이 아니면 빈 값으로 시작해서, 엉뚱한 데이터 때문에 앱이 멈추지 않게 한다.
function loadSavedEvents() {
  const saved = loadJSON(STORAGE_KEYS.events);
  return Array.isArray(saved) ? saved : [];
}

// 시간 일정(카드)을 읽는다.
// 새 모양으로 저장된 게 아직 없으면, 옛 모양(시간 칸)을 새 모양으로 바꿔 한 번 저장해 둔다.
// 옛 데이터는 지우지 않는다. 문제가 생겼을 때 되돌릴 수 있는 백업이 된다.
function loadSavedTimeBlocks() {
  const saved = loadJSON(STORAGE_KEYS.timeBlocks);
  if (isPlainObject(saved)) return saved;

  const oldDaily = loadJSON(STORAGE_KEYS.daily);
  if (!isPlainObject(oldDaily)) return {};
  const migrated = migrateDailyToBlocks(oldDaily);
  saveJSON(STORAGE_KEYS.timeBlocks, migrated);
  return migrated;
}

// 일정 데이터(기간·종일 일정 목록, 날짜별 시간 일정 카드)를 들고 있고 추가·수정·삭제·저장을 맡는 훅.
// 화면(팝업 열고 닫기, 입력창 등)은 알지 못한다. 저장 방식이 바뀌면 이 파일만 고치면 된다.
//
// 데이터는 두 벌이다. (리디자인 기획서 "저장 규칙": 저장 버튼을 눌러야만 저장)
//   저장된 것(saved)       저장소(로그인했으면 수파베이스, 아니면 브라우저)에 있는 것. 달력에 보인다.
//   고치는 중인 것(working)  패널에서 고친 것. 패널에 보인다. save()를 부르기 전에는 저장소에 쓰지 않는다.
//   save()    고치는 중인 것을 저장소에 쓰고 "저장된 것"으로 삼는다
//   revert()  고치는 중인 것을 버리고 마지막으로 저장한 상태로 돌아간다
//   changeCount  두 벌이 몇 군데 다른지 (저장 안 한 변경 개수)
// 고치는 함수들은 모두 "고치는 중인 것"만 바꾼다. 단, 이름이 commit으로 시작하는 함수는 두 벌에 함께 적용하고
// 바로 저장소에 쓴다. (새 일정 패널의 [저장], 삭제 확인 팝업의 [확인]처럼 스스로 확인을 받은 동작에만 쓴다)
//
//   events:     [{ id, title, start_date, end_date, color, todos? }]  (todos는 할 일 목록, 예전 일정에는 없다)
//   timeBlocks: { '2026-01-05': [{ id, start: '09:00', end: '10:00', content, color, is_important, todos? }] } (날짜마다 시작 시각 순서)
//               todos는 할 일 목록 [{ id, text, done }]. 예전에 만든 카드에는 없다. (utils/todos.js 참고)
//               (카드 모양은 utils/timeBlocks.js 설명 참고)
//
// 어디에 저장하나 (로그인했으면 수파베이스, 아니면 브라우저 저장소):
//   initialData  { events, timeBlocks }  수파베이스에서 미리 읽어 온 값 (PlannerLoader가 넘긴다)
//   persist      (changes) => Promise    수파베이스에 쓰는 함수. changes = { events?, timeBlocks? }
//   둘 다 없으면(시험 등) 예전처럼 브라우저 저장소(localStorage)를 쓴다.
//   saveFailed   수파베이스에 쓰지 못했다 (인터넷 끊김 등). retrySave()로 "저장된 것"을 다시 보낸다
export default function usePlannerData({ initialData = null, persist = null } = {}) {
  // useState에 함수를 넘기면 맨 처음 한 번만 실행되어 그 결과가 초기값이 된다.
  // 그래서 저장된 일정으로 곧바로 시작할 수 있고, 빈 화면이 먼저 뜨는 일이 없다.
  const [savedEvents, setSavedEvents] = useState(() => (initialData ? initialData.events : loadSavedEvents()));
  const [savedTimeBlocks, setSavedTimeBlocks] = useState(() => (initialData ? initialData.timeBlocks : loadSavedTimeBlocks()));
  // 고치는 중인 것: 처음에는 저장된 것과 같다
  const [events, setEvents] = useState(savedEvents);
  const [timeBlocks, setTimeBlocks] = useState(savedTimeBlocks);
  const [saveFailed, setSaveFailed] = useState(false);

  // 저장소에 쓴다. changes에 넣은 것만 쓴다. 예: write({ events: 새목록 })
  // 수파베이스는 인터넷을 거치므로 결과를 기다리지 않고 화면은 바로 "저장됨"으로 바꾼다.
  // 실패하면 saveFailed를 켜서 화면이 "다시 저장"을 보여 주게 한다.
  const write = (changes) => {
    if (!persist) {
      if ('events' in changes) saveJSON(STORAGE_KEYS.events, changes.events);
      if ('timeBlocks' in changes) saveJSON(STORAGE_KEYS.timeBlocks, changes.timeBlocks);
      return;
    }
    setSaveFailed(false);
    persist(changes).catch((error) => {
      console.error('수파베이스에 저장하지 못했습니다.', error);
      setSaveFailed(true);
    });
  };

  // [다시 저장]: 마지막으로 "저장된 것"(달력에 보이는 것)을 통째로 다시 보낸다
  const retrySave = () => write({ events: savedEvents, timeBlocks: savedTimeBlocks });

  // 기간·종일 일정 목록을 고친다. change는 "지금 목록 → 새 목록" 함수다.
  // 화면이 들고 있던 옛 목록이 아니라 늘 가장 최신 목록(prev)을 받아서 고치므로, 연달아 고쳐도 앞의 변경이 사라지지 않는다.
  const updateEvents = (change) => setEvents((prev) => change(prev));

  // 두 벌에 함께 적용하고 바로 저장소에 쓴다 (commit 함수들이 쓴다)
  const commitEvents = (change) => {
    setEvents((prev) => change(prev));
    setSavedEvents((prev) => {
      const updated = change(prev);
      write({ events: updated });
      return updated;
    });
  };

  // 새 일정을 추가한다. id는 여기서 만든다. 예: addEvent({ title, start_date, end_date, color })
  const makeEvent = (eventData) => ({ ...eventData, id: Date.now() });
  const addEvent = (eventData) => {
    const evt = makeEvent(eventData);
    updateEvents((list) => [...list, evt]);
  };
  // 새 일정 패널의 [저장]: 그 일정 하나만 바로 저장한다
  const commitAddEvent = (eventData) => {
    const evt = makeEvent(eventData);
    commitEvents((list) => [...list, evt]);
  };

  // id가 같은 일정을 통째로 교체한다.
  const changeEvent = (updatedEvent) => {
    updateEvents((list) => list.map((evt) => (evt.id === updatedEvent.id ? updatedEvent : evt)));
  };

  // id가 같은 일정에 바뀐 값(changes)만 덮어쓴다. 예: patchEvent(id, { title: '워크숍' })
  const patchEvent = (id, changes) => {
    updateEvents((list) => list.map((evt) => (evt.id === id ? { ...evt, ...changes } : evt)));
  };

  // 일정의 할 일 목록을 고친다. change는 "지금 할 일 목록 → 새 목록" 함수다. (utils/todos.js의 도구를 넘긴다)
  const changeEventTodos = (id, change) => {
    updateEvents((list) => list.map((evt) => (evt.id === id ? { ...evt, todos: change(todosOf(evt)) } : evt)));
  };

  const removeEvent = (id) => {
    updateEvents((list) => list.filter((evt) => evt.id !== id));
  };
  // 삭제 확인 팝업의 [확인]: 바로 저장소에서도 지운다
  const commitRemoveEvent = (id) => {
    commitEvents((list) => list.filter((evt) => evt.id !== id));
  };

  // 한 날짜의 카드 목록을 고친다. change는 "지금 목록 → 새 목록" 함수다.
  // 화면이 들고 있던 옛 목록이 아니라 늘 가장 최신 목록(prev)을 받아서 고치므로,
  // 카드를 만들자마자 이름을 고치는 것처럼 연달아 고쳐도 앞의 변경이 덮어써지지 않는다.
  const updateDayBlocks = (date, change) => {
    setTimeBlocks((prev) => ({ ...prev, [date]: change(prev[date] || []) }));
  };

  // 한 날짜의 시간 일정 카드를 새 목록으로 통째로 덮어쓴다.
  const saveDayBlocks = (date, blocks) => updateDayBlocks(date, () => blocks);

  // 카드 하나를 더하고 시작 시각 순서로 정렬한다.
  const addTimeBlock = (date, block) => updateDayBlocks(date, (list) => sortBlocks([...list, block]));
  // 새 일정 패널의 [저장]: 그 카드 하나만 바로 저장한다
  const commitAddTimeBlock = (date, block) => {
    const add = (prev) => ({ ...prev, [date]: sortBlocks([...(prev[date] || []), block]) });
    setTimeBlocks(add);
    setSavedTimeBlocks((prev) => {
      const updated = add(prev);
      write({ timeBlocks: updated });
      return updated;
    });
  };

  // id가 같은 카드에 바뀐 값(changes)만 덮어쓰고 시작 시각 순서로 다시 정렬한다. 예: changeTimeBlock(date, id, { content: '회의' })
  // (카드를 다른 카드 뒤로 옮기면 순서가 바뀌므로 정렬한다)
  const changeTimeBlock = (date, id, changes) =>
    updateDayBlocks(date, (list) => sortBlocks(list.map((block) => (block.id === id ? { ...block, ...changes } : block))));

  const removeTimeBlock = (date, id) => updateDayBlocks(date, (list) => list.filter((block) => block.id !== id));

  // 카드의 할 일 목록을 고친다. change는 "지금 할 일 목록 → 새 목록" 함수다. (utils/todos.js의 도구를 넘긴다)
  // 예: changeTodos(date, id, (todos) => addTodo(todos, '자료 출력'))
  const changeTodos = (date, id, change) =>
    updateDayBlocks(date, (list) => list.map((block) => (block.id === id ? { ...block, todos: change(todosOf(block)) } : block)));

  // 이름도 할 일도 비어 있을 때만 지운다. (카드 상세 패널을 이름 없이 닫으면 실수로 만든 카드로 보고 치운다)
  // 할 일이 적혀 있으면 이름이 없어도 남긴다. (써 둔 할 일이 날아가지 않게)
  const isEmptyBlock = (block) => block.content.trim() === '' && todosOf(block).length === 0;
  const removeTimeBlockIfEmpty = (date, id) =>
    updateDayBlocks(date, (list) => list.filter((block) => block.id !== id || !isEmptyBlock(block)));

  // [저장]: 고치는 중인 것을 저장소에 쓰고 "저장된 것"으로 삼는다.
  // emptyBlock({ date, id })을 주면 그 카드가 이름도 할 일도 없을 때 먼저 치우고 저장한다. (패널을 닫으며 저장할 때)
  const save = (emptyBlock = null) => {
    let blocksToSave = timeBlocks;
    if (emptyBlock) {
      const { date, id } = emptyBlock;
      blocksToSave = { ...timeBlocks, [date]: (timeBlocks[date] || []).filter((block) => block.id !== id || !isEmptyBlock(block)) };
      setTimeBlocks(blocksToSave);
    }
    write({ events, timeBlocks: blocksToSave });
    setSavedEvents(events);
    setSavedTimeBlocks(blocksToSave);
  };

  // [되돌리기]: 마지막으로 저장한 상태로 돌아간다
  const revert = () => {
    setEvents(savedEvents);
    setTimeBlocks(savedTimeBlocks);
  };

  const changeCount = countChanges({ events: savedEvents, timeBlocks: savedTimeBlocks }, { events, timeBlocks });

  return {
    events, timeBlocks, savedEvents, savedTimeBlocks, changeCount, save, revert, saveFailed, retrySave,
    addEvent, commitAddEvent, changeEvent, patchEvent, changeEventTodos, removeEvent, commitRemoveEvent,
    saveDayBlocks, addTimeBlock, commitAddTimeBlock, changeTimeBlock, removeTimeBlock, removeTimeBlockIfEmpty, changeTodos,
  };
}
