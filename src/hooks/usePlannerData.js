import { useState } from 'react';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';
import { migrateDailyToBlocks, sortBlocks } from '../utils/timeBlocks';

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
//   events:     [{ id, title, start_date, end_date, color }]
//   timeBlocks: { '2026-01-05': [{ id, start: '09:00', end: '10:00', content, color, is_important }] } (날짜마다 시작 시각 순서)
//               (카드 모양은 utils/timeBlocks.js 설명 참고)
export default function usePlannerData() {
  // useState에 함수를 넘기면 맨 처음 한 번만 실행되어 그 결과가 초기값이 된다.
  // 그래서 저장된 일정으로 곧바로 시작할 수 있고, 빈 화면이 먼저 뜨는 일이 없다.
  const [events, setEvents] = useState(loadSavedEvents);
  const [timeBlocks, setTimeBlocks] = useState(loadSavedTimeBlocks);

  // 목록을 바꾸고 저장하는 일을 한 곳에서 처리한다.
  const commitEvents = (updatedEvents) => {
    setEvents(updatedEvents);
    saveJSON(STORAGE_KEYS.events, updatedEvents);
  };

  // 새 일정을 추가한다. id는 여기서 만든다. 예: addEvent({ title, start_date, end_date, color })
  const addEvent = (eventData) => {
    commitEvents([...events, { ...eventData, id: Date.now() }]);
  };

  // id가 같은 일정을 통째로 교체한다.
  const changeEvent = (updatedEvent) => {
    commitEvents(events.map(evt => evt.id === updatedEvent.id ? updatedEvent : evt));
  };

  const removeEvent = (id) => {
    commitEvents(events.filter(evt => evt.id !== id));
  };

  // 한 날짜의 카드 목록을 고친다. change는 "지금 목록 → 새 목록" 함수다.
  // 화면이 들고 있던 옛 목록이 아니라 늘 가장 최신 목록(prev)을 받아서 고치므로,
  // 카드를 만들자마자 이름을 고치는 것처럼 연달아 저장해도 앞의 저장이 덮어써지지 않는다.
  const updateDayBlocks = (date, change) => {
    setTimeBlocks((prev) => {
      const updated = { ...prev, [date]: change(prev[date] || []) };
      saveJSON(STORAGE_KEYS.timeBlocks, updated);
      return updated;
    });
  };

  // 한 날짜의 시간 일정 카드를 새 목록으로 통째로 덮어쓴다.
  const saveDayBlocks = (date, blocks) => updateDayBlocks(date, () => blocks);

  // 카드 하나를 더하고 시작 시각 순서로 정렬한다.
  const addTimeBlock = (date, block) => updateDayBlocks(date, (list) => sortBlocks([...list, block]));

  // id가 같은 카드에 바뀐 값(changes)만 덮어쓴다. 예: changeTimeBlock(date, id, { content: '회의' })
  const changeTimeBlock = (date, id, changes) =>
    updateDayBlocks(date, (list) => list.map((block) => (block.id === id ? { ...block, ...changes } : block)));

  const removeTimeBlock = (date, id) => updateDayBlocks(date, (list) => list.filter((block) => block.id !== id));

  // 이름이 비어 있을 때만 지운다. (카드 상세 패널을 이름 없이 닫으면 실수로 만든 카드로 보고 치운다)
  const removeTimeBlockIfEmpty = (date, id) =>
    updateDayBlocks(date, (list) => list.filter((block) => block.id !== id || block.content.trim() !== ''));

  return {
    events, timeBlocks, addEvent, changeEvent, removeEvent,
    saveDayBlocks, addTimeBlock, changeTimeBlock, removeTimeBlock, removeTimeBlockIfEmpty,
  };
}
