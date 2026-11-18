import { useState } from 'react';

import { addDays, getTodayString } from '../utils/date';
import { nextFreeHour } from '../utils/timeBlocks';
import useDragSelect from './useDragSelect';

// 오른쪽 패널들과 확인 팝업이 언제 열리고 닫히는지 정하는 훅.
// 데이터를 바꾸는 일은 usePlannerData가 하고, 이 훅은 "무엇이 열려 있는가"만 기억한다.
//   data: usePlannerData()가 돌려준 값
//
// 화면 짜임: [달력] [일정 패널] [두 번째 패널]
//   일정 패널     panel = { date, openCount }. null이면 닫힘.
//                 openCount는 열 때마다 1씩 늘린다. 같은 날짜를 다시 눌러도 패널을 새로 그려 커서·스크롤을 다시 잡게 한다.
//   두 번째 패널  한 번에 하나만 연다:
//                 - 카드 상세 패널      selectedBlockId (패널 날짜의 시간 일정 카드)
//                 - 기간 일정 상세 패널  openEventId (기간·종일 일정)
//                 - 새 일정 패널        newDraft (NewEventPanel의 draft 설명 참고). openCount를 key로 써서 열 때마다 입력칸을 비운다
export default function usePanels(data) {
  const {
    events, timeBlocks, changeCount, save, revert,
    commitAddEvent, commitRemoveEvent, commitAddTimeBlock, removeTimeBlock, removeTimeBlockIfEmpty,
  } = data;

  const [panel, setPanel] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [openEventId, setOpenEventId] = useState(null);
  const [newDraft, setNewDraft] = useState(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null); // 삭제 확인 팝업이 묻고 있는 기간 일정. null이면 팝업 닫힘

  // 날짜를 두 칸 이상 끌어서 고르면: 시작한 날의 일정 패널 + 새 일정 패널(종일, 고른 기간 채움)을 연다.
  // 고른 칸의 모양(파랑 테두리)은 새 일정을 저장하거나 취소할 때까지 남겨 둔다. (어디에 생길지 보이게)
  const drag = useDragSelect({
    onSelect: (start, end) => openNewEvent(start, 'allday', { startDate: start, endDate: end }, { keepSelection: true }),
  });

  // 카드 상세 패널을 닫거나 다른 카드로 바꿀 때: 지금 고른 카드가 이름도 할 일도 없이 남아 있으면 지운다.
  // (시간표를 실수로 눌러 생긴 빈 카드가 쌓이지 않게)
  const releaseBlock = () => {
    if (panel && selectedBlockId) removeTimeBlockIfEmpty(panel.date, selectedBlockId);
  };

  // 새 일정 패널을 닫는다. 끌어서 고른 칸의 모양도 지운다.
  const closeNewEvent = () => {
    setNewDraft(null);
    drag.clearSelection();
  };

  // 두 번째 패널을 모두 닫는다 (빈 카드는 치운다)
  const closeSecondPanels = () => {
    releaseBlock();
    setSelectedBlockId(null);
    setOpenEventId(null);
    closeNewEvent();
  };

  // 카드를 고른다(카드 상세 패널을 연다). id가 null이면 닫는다.
  const selectBlock = (id) => {
    if (id !== selectedBlockId) releaseBlock();
    setSelectedBlockId(id);
    if (id !== null) { setOpenEventId(null); closeNewEvent(); }
  };

  // 기간 일정을 고른다(기간 일정 상세 패널을 연다). id가 null이면 닫는다. 열려 있던 카드 상세 패널은 닫는다.
  const selectEvent = (id) => {
    releaseBlock();
    setSelectedBlockId(null);
    setOpenEventId(id);
    if (id !== null) closeNewEvent();
  };

  // 새 일정 패널을 연다. date의 일정 패널도 함께 연다(이미 그 날이 열려 있으면 그대로 둔다). 열려 있던 카드·기간 일정 상세 패널은 닫는다.
  //   kind: 'timed'(시간 일정) | 'allday'(종일 일정),  extra: 처음 값 덮어쓰기 (예: 끈 기간 { startDate, endDate })
  const openNewEvent = (date, kind, extra = {}, { keepSelection = false } = {}) => {
    if (!keepSelection) drag.clearSelection();
    releaseBlock();
    setSelectedBlockId(null);
    setOpenEventId(null);
    if (panel?.date !== date) setPanel(prev => ({ date, openCount: (prev?.openCount ?? 0) + 1 }));
    const [startSlot, endSlot] = nextFreeHour(timeBlocks[date] || [], {
      isToday: date === getTodayString(),
      nowHour: new Date().getHours(),
    });
    setNewDraft(prev => ({ kind, date, startDate: date, endDate: date, startSlot, endSlot, ...extra, openCount: (prev?.openCount ?? 0) + 1 }));
  };

  // 새 일정 패널의 저장: 시간 일정은 그날 카드로, 종일 일정은 기간 일정으로 바로 저장하고 패널을 닫는다.
  // (새 일정 패널은 스스로 [저장]을 받으므로, 일정 패널의 저장 줄을 거치지 않고 그 일정 하나만 저장한다)
  const saveNewEvent = (result) => {
    if (result.kind === 'timed') commitAddTimeBlock(newDraft.date, result.block);
    else commitAddEvent(result.event);
    closeNewEvent();
  };

  // 그날의 일정 패널을 연다. (날짜 칸을 누르거나, 날짜 버튼에서 Enter, 또는 +N 더보기)
  // blockId를 주면(칸의 시간 일정을 눌렀을 때) 그 카드를 골라 카드 상세 패널까지 함께 열고,
  // eventId를 주면(칸의 기간 일정 막대를 눌렀을 때) 그 일정의 기간 일정 상세 패널까지 함께 연다.
  // e는 달력 칸에서 누른 경우에만 있다.
  const openDayPanel = (e, dateString, blockId = null, eventId = null) => {
    if (e) e.stopPropagation();
    closeNewEvent();
    releaseBlock();
    setSelectedBlockId(blockId);
    setOpenEventId(eventId);
    setPanel(prev => ({ date: dateString, openCount: (prev?.openCount ?? 0) + 1 }));
  };

  // 패널의 ‹ › 버튼: 전날·다음 날로 넘긴다. 두 번째 패널은 닫는다.
  const moveDayPanel = (days) => {
    closeSecondPanels();
    setPanel(prev => ({ date: addDays(prev.date, days), openCount: prev.openCount + 1 }));
  };

  const closePanelNow = () => {
    closeSecondPanels();
    setPanel(null);
  };

  // 일정 패널의 X: 저장 안 한 변경이 있으면 먼저 묻는다 (닫으면 고치던 내용이 화면에서 사라져 보이므로).
  // 날짜·카드를 옮길 때는 묻지 않는다. 고치던 내용은 옮겨도 그대로 남고 저장 줄에 계속 보이기 때문이다.
  const closeDayPanel = () => {
    if (changeCount > 0) setShowCloseConfirm(true);
    else closePanelNow();
  };

  // 닫기 확인 팝업의 세 버튼
  const closeConfirm = {
    open: showCloseConfirm,
    // [저장하고 닫기]: 열려 있던 빈 카드(이름도 할 일도 없음)는 치우고 저장한 뒤 닫는다
    saveAndClose: () => {
      setShowCloseConfirm(false);
      save(selectedBlockId ? { date: panel.date, id: selectedBlockId } : null);
      closePanelNow();
    },
    discardAndClose: () => { setShowCloseConfirm(false); closePanelNow(); revert(); },
    cancel: () => setShowCloseConfirm(false),
  };

  // 카드 상세 패널의 "삭제": 카드를 지우고 패널을 닫는다 (저장 줄에서 저장)
  const deleteSelectedBlock = () => {
    removeTimeBlock(panel.date, selectedBlockId);
    setSelectedBlockId(null);
  };

  // 기간 일정 상세 패널의 "삭제"는 확인 팝업을 거친다
  const deleteConfirm = {
    open: eventToDelete !== null,
    ask: (eventItem) => setEventToDelete(eventItem),
    // [확인]을 받았으므로 바로 저장한다. 지운 일정의 상세 패널도 닫는다
    confirm: () => {
      commitRemoveEvent(eventToDelete.id);
      if (eventToDelete.id === openEventId) setOpenEventId(null);
      setEventToDelete(null);
    },
    cancel: () => setEventToDelete(null),
  };

  // 패널에 보여 줄 것 (패널은 "고치는 중인 것"을 보여 준다)
  const panelEvents = panel ? events.filter(e => e.start_date <= panel.date && e.end_date >= panel.date) : [];
  const panelBlocks = panel ? timeBlocks[panel.date] || [] : [];
  const selectedBlock = panelBlocks.find(b => b.id === selectedBlockId) ?? null;
  const openEvent = panel ? events.find(e => e.id === openEventId) ?? null : null;

  return {
    panel, panelEvents, panelBlocks, selectedBlockId, selectedBlock, openEventId, openEvent, newDraft,
    drag,
    openDayPanel, moveDayPanel, closeDayPanel,
    selectBlock, selectEvent, deleteSelectedBlock,
    openNewEvent, closeNewEvent, saveNewEvent,
    closeConfirm, deleteConfirm,
  };
}
