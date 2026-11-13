import { useState } from 'react';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';

// 저장된 값이 기대한 모양(목록 / 일반 객체)이 아니면 빈 값으로 시작해서, 엉뚱한 데이터 때문에 앱이 멈추지 않게 한다.
function loadSavedEvents() {
  const saved = loadJSON(STORAGE_KEYS.events);
  return Array.isArray(saved) ? saved : [];
}

function loadSavedDailySchedules() {
  const saved = loadJSON(STORAGE_KEYS.daily);
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

// 일정 데이터(기간·종일 일정 목록, 날짜별 시간대 일정)를 들고 있고 추가·수정·삭제·저장을 맡는 훅.
// 화면(팝업 열고 닫기, 입력창 등)은 알지 못한다. 저장 방식이 바뀌면 이 파일만 고치면 된다.
//
//   events:         [{ id, title, start_date, end_date, color }]
//   dailySchedules: { '2026-01-05': [{ hour, content, color, is_important }] }
export default function usePlannerData() {
  // useState에 함수를 넘기면 맨 처음 한 번만 실행되어 그 결과가 초기값이 된다.
  // 그래서 저장된 일정으로 곧바로 시작할 수 있고, 빈 화면이 먼저 뜨는 일이 없다.
  const [events, setEvents] = useState(loadSavedEvents);
  const [dailySchedules, setDailySchedules] = useState(loadSavedDailySchedules);

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

  // 한 날짜의 시간대별 일정을 새 목록으로 덮어쓴다.
  const saveDaySchedule = (date, schedules) => {
    const updatedDaily = { ...dailySchedules, [date]: schedules };
    setDailySchedules(updatedDaily);
    saveJSON(STORAGE_KEYS.daily, updatedDaily);
  };

  return { events, dailySchedules, addEvent, changeEvent, removeEvent, saveDaySchedule };
}
