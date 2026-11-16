import { useState } from 'react';

import { COLOR_PALETTE } from './constants/colors';
import { YEAR_RANGE } from './constants/calendar';
import { addDays, getCurrentYear, getYearOptions } from './utils/date';
import { freeGapAround } from './utils/timeBlocks';
import useDragSelect from './hooks/useDragSelect';
import usePlannerData from './hooks/usePlannerData';
import Header from './components/layout/Header';
import ViewModeToggle from './components/calendar/ViewModeToggle';
import YearSection from './components/calendar/YearSection';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import PeriodEventModal from './components/modals/PeriodEventModal';
import EditEventModal from './components/modals/EditEventModal';
import DayPanel from './components/panels/DayPanel';
import BlockPanel from './components/panels/BlockPanel';

export default function App() {
  const {
    events, timeBlocks, addEvent, changeEvent, removeEvent,
    addTimeBlock, changeTimeBlock, removeTimeBlock, removeTimeBlockIfEmpty,
  } = usePlannerData();

  // 앱을 연 해(올해)를 한 번 읽어 고정하고, 그 해로 시작한다. 선택 칸의 연도 목록도 이 해를 기준으로 만든다.
  const [thisYear] = useState(getCurrentYear);
  const [currentYear, setCurrentYear] = useState(thisYear);
  const yearOptions = getYearOptions(thisYear, YEAR_RANGE);
  const [isWrapMode, setIsWrapMode] = useState(false);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });

  // 날짜를 끌어서 고르면 기간 일정 등록 팝업을 연다
  const { selectionStart, selectionEnd, handleMouseDown, handleMouseEnter, clearSelection } = useDragSelect({
    onSelect: (start, end) => {
      setNewEvent(prev => ({ ...prev, start_date: start, end_date: end }));
      setShowPeriodModal(true);
    },
  });

  // 오른쪽 일정 패널. null이면 닫힘.
  //   date       열린 날짜
  //   openCount  열 때마다 1씩 늘린다. 같은 날짜를 다시 눌러도 패널을 새로 그려 커서·스크롤을 다시 잡게 한다.
  const [panel, setPanel] = useState(null);
  // 카드 상세 패널에 열린 시간 일정 카드의 id (패널 날짜의 카드). null이면 카드 상세 패널이 닫혀 있다.
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // 카드 상세 패널을 닫거나 다른 카드로 바꿀 때: 지금 고른 카드가 이름 없이 남아 있으면 지운다.
  // (시간표를 실수로 눌러 생긴 빈 카드가 쌓이지 않게)
  const releaseBlock = () => {
    if (panel && selectedBlockId) removeTimeBlockIfEmpty(panel.date, selectedBlockId);
  };

  // 카드를 고른다(카드 상세 패널을 연다). id가 null이면 닫는다.
  const selectBlock = (id) => {
    if (id !== selectedBlockId) releaseBlock();
    setSelectedBlockId(id);
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 그날의 일정 패널을 연다. (날짜 칸을 누르거나, 날짜 버튼에서 Enter, 또는 +N 더보기)
  // blockId를 주면(칸의 시간 일정을 눌렀을 때) 그 카드를 골라 카드 상세 패널까지 함께 연다.
  // e는 달력 칸에서 누른 경우에만 있다.
  const openDayPanel = (e, dateString, blockId = null) => {
    if (e) e.stopPropagation();
    clearSelection();
    releaseBlock();
    setSelectedBlockId(blockId);
    setPanel(prev => ({ date: dateString, openCount: (prev?.openCount ?? 0) + 1 }));
  };

  // 패널의 ‹ › 버튼: 전날·다음 날로 넘긴다. 카드 상세 패널은 닫는다.
  const moveDayPanel = (days) => {
    releaseBlock();
    setSelectedBlockId(null);
    setPanel(prev => ({ date: addDays(prev.date, days), openCount: prev.openCount + 1 }));
  };

  const closeDayPanel = () => {
    releaseBlock();
    setSelectedBlockId(null);
    setPanel(null);
  };

  const savePeriodEvent = () => {
    if (newEvent.title.trim()) addEvent(newEvent);
    closePeriodModal();
  };

  const closePeriodModal = () => {
    setShowPeriodModal(false);
    clearSelection();
    setNewEvent({ title: '', start_date: '', end_date: '', color: COLOR_PALETTE[0].value });
  };

  const openEditModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowEditModal(true);
  };

  const updateEvent = () => {
    if (!selectedEvent.title.trim()) return alert('일정명을 입력해주세요.');
    changeEvent(selectedEvent);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const openDeleteModal = (e, eventItem) => {
    if (e) e.stopPropagation();
    setSelectedEvent(eventItem);
    setShowDeleteModal(true);
  };

  const deleteEvent = () => {
    removeEvent(selectedEvent.id);
    setShowDeleteModal(false);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  // 기준 연도와 그 다음 연도를 동시 렌더링하기 위한 배열
  const displayYears = [currentYear, currentYear + 1];

  // 달력 날짜 칸(DayCell)까지 전달할 값 묶음
  const cellProps = {
    events, timeBlocks,
    selectionStart, selectionEnd,
    onMouseDown: handleMouseDown, onMouseEnter: handleMouseEnter,
    panelDate: panel?.date ?? null,
    onOpenDay: openDayPanel,
    onEditEvent: openEditModal, onDeleteEvent: openDeleteModal,
    onShowMore: (dateString) => openDayPanel(null, dateString),
  };

  const panelEvents = panel ? events.filter(e => e.start_date <= panel.date && e.end_date >= panel.date) : [];
  const panelBlocks = panel ? timeBlocks[panel.date] || [] : [];
  const selectedBlock = panelBlocks.find(b => b.id === selectedBlockId) ?? null;

  return (
    // 왼쪽은 달력, 오른쪽은 (열려 있으면) 일정 패널. 달력은 패널이 열려도 계속 보인다.
    // 화면 전체는 화면 높이에 딱 맞고 스크롤되지 않는다(h-screen overflow-hidden). 스크롤은 달력 상자와 일정 패널이 각자 안에서 한다.
    <div className="flex bg-background h-screen overflow-hidden">
      {/* 화면 바깥 여백: 위는 머리말 안쪽 여백과 같은 24px(pt-6), 좌우와 아래는 일정 패널과 같은 12px(px-3 pb-3).
          세로로 머리말 → 보기 방식 버튼 → 달력 상자를 쌓고, 달력 상자가 남은 높이를 모두 채운다 */}
      <main className="flex-1 min-w-0 px-3 pt-6 pb-3 flex flex-col">
        <Header year={currentYear} onYearChange={setCurrentYear} years={yearOptions} />

        {/* 보기 방식 버튼은 달력의 설정이라 달력 상자 바로 위 오른쪽에, 달력과 한 묶음으로 보이게 좁은 간격(12px)으로 둔다 */}
        <div className="flex justify-end mb-3 shrink-0">
          <ViewModeToggle isWrapMode={isWrapMode} onWrapModeChange={setIsWrapMode} />
        </div>

        {/* 캘린더 섹션: 헤더 카드와 같은 층이라 같은 파랑 4단계 바탕. 안쪽의 월 이름·연도 구분선은 3단계, 날짜 칸은 1단계(흰색)로 점점 옅어진다.
            남은 높이를 채우고(flex-1 min-h-0) 상자 안에서 스크롤한다. 그래서 스크롤해도 상자의 네 모서리(15px)가 늘 둥글게 보이고, 가로 스크롤 막대도 늘 상자 아래에 있다.
            가로 스크롤은 위아래·좌우 모두(overflow-auto), 화면 맞춤은 위아래만(overflow-y-auto overflow-x-hidden) */}
        <div
          data-testid="calendar-scroll"
          className={`flex-1 min-h-0 rounded-lg shadow-xs bg-surface-blue-4 relative ${isWrapMode ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`}
        >
          {/* 칸 사이에 4px 틈(gap-1)을 둬서 둥근 칸들이 떠 보이게 한다. 상자 안쪽 여백은 위 4px(pt-1, 첫 연도 띠가 -mt-1로 덮음)뿐이라 좌우·아래는 칸이 상자 끝에 붙는다 */}
          <div className={`flex flex-col gap-1 pt-1 ${isWrapMode ? '' : 'min-w-max'}`}>
            {/* 기준 연도와 다음 연도를 순차적으로 렌더링 */}
            {displayYears.map((year, i) => (
              <YearSection key={year} year={year} isFirst={i === 0} isWrapMode={isWrapMode} cellProps={cellProps} />
            ))}
          </div>
        </div>
      </main>

      {/* --- 오른쪽 일정 패널 (이 날의 일정 + 시간 일정) --- */}
      {panel && (
        <DayPanel
          key={`${panel.date}-${panel.openCount}`}
          date={panel.date}
          dayEvents={panelEvents}
          blocks={panelBlocks}
          selectedBlockId={selectedBlockId}
          onClose={closeDayPanel}
          onMoveDay={moveDayPanel}
          onAddAllDay={({ title, color }) => addEvent({ title, start_date: panel.date, end_date: panel.date, color })}
          onEditEvent={(evt) => openEditModal(null, evt)}
          onDeleteEvent={(evt) => openDeleteModal(null, evt)}
          onAddBlock={(block) => addTimeBlock(panel.date, block)}
          onChangeBlock={(id, changes) => changeTimeBlock(panel.date, id, changes)}
          onSelectBlock={selectBlock}
        />
      )}

      {/* --- 그 오른쪽: 고른 시간 일정 카드의 상세 패널 (이름·색·주요·삭제) --- */}
      {panel && selectedBlock && (
        <BlockPanel
          key={selectedBlock.id}
          date={panel.date}
          block={selectedBlock}
          gap={freeGapAround(panelBlocks, selectedBlock.id)}
          onChange={(changes) => changeTimeBlock(panel.date, selectedBlock.id, changes)}
          onDelete={() => { removeTimeBlock(panel.date, selectedBlock.id); setSelectedBlockId(null); }}
          onClose={() => selectBlock(null)}
        />
      )}

      {/* --- 기간 일정 등록 모달 --- */}
      {showPeriodModal && (
        <PeriodEventModal
          event={newEvent}
          onChange={(changes) => setNewEvent(prev => ({ ...prev, ...changes }))}
          onClose={closePeriodModal}
          onSave={savePeriodEvent}
        />
      )}

      {/* --- 일정 수정 모달 --- */}
      {showEditModal && selectedEvent && (
        <EditEventModal
          event={selectedEvent}
          onChange={(changes) => setSelectedEvent(prev => ({ ...prev, ...changes }))}
          onSave={updateEvent}
          onClose={() => { setShowEditModal(false); setSelectedEvent(null); }}
          onDelete={() => setShowDeleteModal(true)}
        />
      )}

      {/* --- 삭제 확인 모달 --- */}
      {showDeleteModal && (
        <DeleteConfirmModal onCancel={() => setShowDeleteModal(false)} onConfirm={deleteEvent} />
      )}
    </div>
  );
}