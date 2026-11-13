import { useState, useEffect } from 'react';
import { STORAGE_KEYS, loadJSON, saveJSON } from '../utils/storage';

// 일정 데이터(기간·종일 일정 목록, 날짜별 시간대 일정)를 들고 있고 추가·수정·삭제·저장을 맡는 훅.
// 화면(팝업 열고 닫기, 입력창 등)은 알지 못한다. 저장 방식이 바뀌면 이 파일만 고치면 된다.
//
//   events:         [{ id, title, start_date, end_date, color }]
//   dailySchedules: { '2026-01-05': [{ hour, content, color, is_important }] }
export default function usePlannerData() {
  const [events, setEvents] = useState([]);
  const [dailySchedules, setDailySchedules] = useState({});

  useEffect(() => {
    const savedEvents = loadJSON(STORAGE_KEYS.events);
    const savedDaily = loadJSON(STORAGE_KEYS.daily);
    if (savedEvents) setEvents(savedEvents);
    if (savedDaily) setDailySchedules(savedDaily);
  }, []);

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
