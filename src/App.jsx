import { useEffect, useState } from 'react';

import { YEAR_RANGE } from './constants/calendar';
import { CALENDAR_BACKGROUND, PAGE_BACKGROUND, VIEW_THEME } from './constants/themes';
import { addDays, formatShortDate, getCurrentYear, getDaysInMonth, getNowTime, getTodayString, getYearOptions, weekStartOf } from './utils/date';
import { setTodoDone } from './utils/todos';
import { nextFreeHour } from './utils/timeBlocks';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useDragSelect from './hooks/useDragSelect';
import usePlannerData from './hooks/usePlannerData';
import Header from './components/layout/Header';
import ViewTabs from './components/layout/ViewTabs';
import SummaryRow from './components/layout/SummaryRow';
import { summarize } from './utils/summary';
import ViewModeToggle from './components/calendar/ViewModeToggle';
import YearSection from './components/calendar/YearSection';
import MonthView from './components/calendar/MonthView';
import WeekView from './components/calendar/WeekView';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import UnsavedCloseModal from './components/modals/UnsavedCloseModal';
import DayPanel from './components/panels/DayPanel';
import BlockPanel from './components/panels/BlockPanel';
import EventPanel from './components/panels/EventPanel';
import NewEventPanel from './components/panels/NewEventPanel';

export default function App() {
  // events·timeBlocks는 "고치는 중인 것"(패널에 보임), savedEvents·savedTimeBlocks는 "저장된 것"(달력에 보임).
  // 패널에서 고친 내용은 일정 패널의 [저장]을 눌러야 저장되고 달력에 반영된다. (usePlannerData 설명 참고)
  const {
    events, timeBlocks, savedEvents, savedTimeBlocks, changeCount, save, revert,
    commitAddEvent, patchEvent, changeEventTodos, commitRemoveEvent,
    addTimeBlock, commitAddTimeBlock, changeTimeBlock, removeTimeBlock, removeTimeBlockIfEmpty, changeTodos,
  } = usePlannerData();

  // 앱을 연 해(올해)를 한 번 읽어 고정하고, 그 해로 시작한다. 선택 칸의 연도 목록도 이 해를 기준으로 만든다.
  const [thisYear] = useState(getCurrentYear);
  const [currentYear, setCurrentYear] = useState(thisYear);
  const yearOptions = getYearOptions(thisYear, YEAR_RANGE);
  const [isWrapMode, setIsWrapMode] = useState(false);
  // 보기: 'year'(연) | 'month'(월) | 'week'(주)
  const [view, setView] = useState('year');
  // 월 보기에서 보는 달 (1~12). 해는 currentYear를 함께 쓴다. 처음에는 이번 달
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  // 주 보기에서 보는 주의 일요일 'YYYY-MM-DD'. 처음에는 이번 주
  const [weekStart, setWeekStart] = useState(() => weekStartOf(getTodayString()));
  const isMonthView = view === 'month';
  const isWeekView = view === 'week';
  // 보기 색: 연 = 파랑, 월 = 앰버, 주 = 민트 (constants/themes.js)
  const theme = VIEW_THEME[view];
  // 보기를 바꾼다. 보는 해가 올해면 이번 달·이번 주를, 아니면 그 해 1월·첫 주를 보여 준다
  const changeView = (next) => {
    const isThisYear = currentYear === thisYear;
    if (next === 'month' && isThisYear) setCurrentMonth(new Date().getMonth() + 1);
    if (next === 'week') setWeekStart(weekStartOf(isThisYear ? getTodayString() : `${currentYear}-01-01`));
    setView(next);
  };
  // 주를 옮긴다. 보는 해(요약 줄·연도 선택 기준)는 그 주의 가운데(수요일)가 속한 해로 맞춘다
  const changeWeek = (start) => {
    setWeekStart(start);
    setCurrentYear(Number(addDays(start, 3).slice(0, 4)));
  };
  // 상단 바의 연도 선택: 주 보기에서는 그 해의 첫 주로 간다
  const changeYear = (year) => {
    setCurrentYear(year);
    if (isWeekView) setWeekStart(weekStartOf(`${year}-01-01`));
  };
  // 일정 패널의 보기 방식: 'list'(목록) | 'timetable'(시간표). 날짜를 넘기거나 패널을 다시 열어도 고른 값을 유지한다
  const [panelView, setPanelView] = useState('list');

  // 상단 바의 "오늘": 올해로 돌아가 오늘 날짜 칸을 누른 것처럼 오늘의 일정 패널을 열고(칸에 테두리),
  // 달력 상자를 오늘 칸이 가운데 오도록 스크롤한다.
  // 연도가 바뀌거나 패널이 열리면 달력이 다시 그려진 뒤에 칸을 찾아야 하므로, 다음 화면 그리기 때(requestAnimationFrame) 스크롤한다.
  const goToToday = () => {
    const today = getTodayString();
    setCurrentYear(thisYear);
    setCurrentMonth(Number(today.slice(5, 7)));
    setWeekStart(weekStartOf(today));
    openDayPanel(null, today);
    requestAnimationFrame(() => {
      const cell = document.querySelector(`[data-date="${today}"]`);
      cell?.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
    });
  };

  // 새 일정 패널(오른쪽 두 번째 패널)의 처음 값. null이면 닫혀 있다. (NewEventPanel의 draft 설명 참고)
  //   openCount를 key로 써서, 새로 열 때마다 입력칸을 비운 새 패널을 그린다.
  const [newDraft, setNewDraft] = useState(null);

  // 날짜를 두 칸 이상 끌어서 고르면: 시작한 날의 일정 패널 + 새 일정 패널(종일, 고른 기간 채움)을 연다.
  // 고른 칸의 모양(파랑 테두리)은 새 일정을 저장하거나 취소할 때까지 남겨 둔다. (어디에 생길지 보이게)
  const { selectionStart, selectionEnd, handleMouseDown, handleMouseEnter, clearSelection } = useDragSelect({
    onSelect: (start, end) => openNewEvent(start, 'allday', { startDate: start, endDate: end }, { keepSelection: true }),
  });

  // 오른쪽 일정 패널. null이면 닫힘.
  //   date       열린 날짜
  //   openCount  열 때마다 1씩 늘린다. 같은 날짜를 다시 눌러도 패널을 새로 그려 커서·스크롤을 다시 잡게 한다.
  const [panel, setPanel] = useState(null);
  // 카드 상세 패널에 열린 시간 일정 카드의 id (패널 날짜의 카드). null이면 카드 상세 패널이 닫혀 있다.
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  // 카드 상세 패널을 닫거나 다른 카드로 바꿀 때: 지금 고른 카드가 이름도 할 일도 없이 남아 있으면 지운다.
  // (시간표를 실수로 눌러 생긴 빈 카드가 쌓이지 않게)
  const releaseBlock = () => {
    if (panel && selectedBlockId) removeTimeBlockIfEmpty(panel.date, selectedBlockId);
  };

  // 기간 일정 상세 패널에 열린 기간·종일 일정의 id. null이면 닫혀 있다.
  // 오른쪽 두 번째 패널은 한 번에 하나만 연다: 시간 일정 카드(selectedBlockId)나 기간 일정(openEventId) 중 하나.
  const [openEventId, setOpenEventId] = useState(null);

  // 카드를 고른다(카드 상세 패널을 연다). id가 null이면 닫는다.
  const selectBlock = (id) => {
    if (id !== selectedBlockId) releaseBlock();
    setSelectedBlockId(id);
    if (id !== null) { setOpenEventId(null); closeNewEvent(); }
  };

  // 기간 일정을 고른다(기간 일정 상세 패널을 연다). id가 null이면 닫는다. 열려 있던 시간 카드 상세 패널은 닫는다.
  const selectEvent = (id) => {
    releaseBlock();
    setSelectedBlockId(null);
    setOpenEventId(id);
    if (id !== null) closeNewEvent();
  };

  // 새 일정 패널을 닫는다. 끌어서 고른 칸의 모양도 지운다.
  const closeNewEvent = () => {
    setNewDraft(null);
    clearSelection();
  };

  // 새 일정 패널을 연다. date의 일정 패널도 함께 연다(이미 그 날이 열려 있으면 그대로 둔다). 열려 있던 카드·기간 일정 상세 패널은 닫는다.
  //   kind: 'timed'(시간 일정) | 'allday'(종일 일정),  extra: 처음 값 덮어쓰기 (예: 끈 기간 { startDate, endDate })
  const openNewEvent = (date, kind, extra = {}, { keepSelection = false } = {}) => {
    if (!keepSelection) clearSelection();
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  // 패널의 ‹ › 버튼: 전날·다음 날로 넘긴다. 카드·기간 일정 상세 패널은 닫는다.
  const moveDayPanel = (days) => {
    releaseBlock();
    setSelectedBlockId(null);
    setOpenEventId(null);
    closeNewEvent();
    setPanel(prev => ({ date: addDays(prev.date, days), openCount: prev.openCount + 1 }));
  };

  const closePanelNow = () => {
    releaseBlock();
    setSelectedBlockId(null);
    setOpenEventId(null);
    closeNewEvent();
    setPanel(null);
  };

  // 일정 패널의 X: 저장 안 한 변경이 있으면 먼저 묻는다 (닫으면 고치던 내용이 화면에서 사라져 보이므로).
  // 날짜·카드를 옮길 때는 묻지 않는다. 고치던 내용은 옮겨도 그대로 남고 저장 줄에 계속 보이기 때문이다.
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const closeDayPanel = () => {
    if (changeCount > 0) setShowCloseConfirm(true);
    else closePanelNow();
  };
  // 저장 안 한 변경이 있으면 창을 닫거나 새로 고칠 때 브라우저가 "사이트에서 나가시겠습니까?"로 한 번 막는다
  useEffect(() => {
    if (changeCount === 0) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changeCount]);

  // 기간 일정 상세 패널의 "삭제"를 누르면 확인 팝업을 띄운다.
  const openDeleteModal = (eventItem) => {
    setSelectedEvent(eventItem);
    setShowDeleteModal(true);
  };

  const deleteEvent = () => {
    commitRemoveEvent(selectedEvent.id); // 삭제 확인 팝업에서 [확인]을 받았으므로 바로 저장한다
    if (selectedEvent.id === openEventId) setOpenEventId(null); // 지운 일정의 상세 패널도 닫는다
    setShowDeleteModal(false);
    setSelectedEvent(null);
  };

  // 요약 줄의 범위와 이름
  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const isThisMonth = monthKey === getTodayString().slice(0, 7);
  const weekEnd = addDays(weekStart, 6);
  const isThisWeek = getTodayString() >= weekStart && getTodayString() <= weekEnd;
  let summaryRange; let summaryScope;
  if (isWeekView) {
    summaryRange = { from: weekStart, to: weekEnd };
    summaryScope = isThisWeek ? '이번 주' : `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`;
  } else if (isMonthView) {
    summaryRange = { from: `${monthKey}-01`, to: `${monthKey}-${String(getDaysInMonth(currentYear, currentMonth)).padStart(2, '0')}` };
    summaryScope = isThisMonth ? '이달' : `${currentMonth}월`;
  } else {
    summaryRange = { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` };
    summaryScope = currentYear === thisYear ? '올해' : `${currentYear}년`;
  }

  // 기준 연도와 그 다음 연도를 동시 렌더링하기 위한 배열
  const displayYears = [currentYear, currentYear + 1];

  // 달력 날짜 칸(DayCell)까지 전달할 값 묶음
  // 달력은 "저장된 것"을 보여 준다 (저장해야 달력에 반영된다)
  const cellProps = {
    events: savedEvents, timeBlocks: savedTimeBlocks,
    selectionStart, selectionEnd,
    onMouseDown: handleMouseDown, onMouseEnter: handleMouseEnter,
    panelDate: panel?.date ?? null,
    today: getTodayString(), // 할 일 알약이 오늘·지난 날·앞으로의 날을 가른다
    theme, // 칸 테두리 색 (달력 영역과 같은 보기 색 2단계)
    onOpenDay: openDayPanel,
    onShowMore: (dateString) => openDayPanel(null, dateString),
  };

  const panelEvents = panel ? events.filter(e => e.start_date <= panel.date && e.end_date >= panel.date) : [];
  const panelBlocks = panel ? timeBlocks[panel.date] || [] : [];
  const selectedBlock = panelBlocks.find(b => b.id === selectedBlockId) ?? null;
  const openEvent = panel ? events.find(e => e.id === openEventId) ?? null : null;

  return (
    // 화면 짜임: 맨 위 상단 바(화면 전체 폭) 아래에 한 줄로 [달력 상자] [일정 패널] [두 번째 패널]이 나란히 선다.
    // 그래서 달력과 패널들은 같은 높이에서 시작해 같은 높이에서 끝난다. 달력은 패널이 열려도 계속 보인다.
    // 화면 전체는 화면 높이에 딱 맞고 스크롤되지 않는다(h-screen overflow-hidden). 스크롤은 달력 상자와 패널이 각자 안에서 한다.
    // 화면 바깥 여백: 위 24px(pt-6), 좌우·아래 12px(px-3 pb-3). 상단 바와 아래 줄 사이, 줄 안의 상자 사이는 모두 12px.
    // 화면 바탕은 보기 색 5단계 (constants/themes.js의 PAGE_BACKGROUND)
    <div className={`flex flex-col ${PAGE_BACKGROUND[theme]} h-screen overflow-hidden px-3 pt-6 pb-3`}>
        {/* 상단 바 한 줄: 왼쪽은 기간 캡슐, 오른쪽 끝은 연·월·주 탭, (연 보기만) 보기 방식 탭, "새 일정" 버튼 */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <Header
            year={currentYear} onYearChange={changeYear} years={yearOptions} onToday={goToToday}
            theme={theme}
            month={isMonthView ? currentMonth : null}
            onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m); }}
            weekStart={isWeekView ? weekStart : null}
            onWeekChange={changeWeek}
          />
          <div className="ml-auto flex items-center gap-3">
            <ViewTabs view={view} onViewChange={changeView} />
            {/* 가로 스크롤 / 화면 맞춤은 연 보기에만 있는 설정 */}
            {view === 'year' && <ViewModeToggle isWrapMode={isWrapMode} onWrapModeChange={setIsWrapMode} />}
            {/* 새 일정: 열린 날(없으면 오늘)의 일정 패널 + 새 일정 패널(시간 일정) */}
            <Button className="h-10 rounded-full px-4 font-semibold" onClick={() => openNewEvent(panel?.date ?? getTodayString(), 'timed')}>
              <Plus aria-hidden="true" />새 일정
            </Button>
          </div>
        </div>

      {/* 요약 줄: 지금 보는 범위의 할 일 · 7일 이내 주요 일정 · 못 끝낸 일 (저장된 일정 기준) */}
      {/* 범위만 보기에 따라 바뀐다: 연 = 그 해, 월 = 그달 */}
      <SummaryRow
        scope={summaryScope}
        summary={summarize({ events: savedEvents, timeBlocks: savedTimeBlocks, ...summaryRange, today: getTodayString(), now: getNowTime() })}
      />

      {/* 아래 한 줄: 남은 높이를 모두 쓰고, 달력 상자와 패널들이 같은 높이로 선다 */}
      <div className="flex-1 min-h-0 flex gap-3">
      <main className="flex-1 min-w-0 flex flex-col">
        {/* 캘린더 섹션: 파랑 2단계 바탕(연도 구분선도 같은 색). 그 위에 월 이름 칸과 날짜 칸이 흰색(1단계)으로 떠 보인다. (리디자인 기획서 "달력 영역 = 2단계")
            남은 높이를 채우고(flex-1 min-h-0) 상자 안에서 스크롤한다. 그래서 스크롤해도 상자의 네 모서리(15px)가 늘 둥글게 보이고, 가로 스크롤 막대도 늘 상자 아래에 있다.
            가로 스크롤은 위아래·좌우 모두(overflow-auto), 화면 맞춤은 위아래만(overflow-y-auto overflow-x-hidden) */}
        {isWeekView ? (
          // 주 보기(보드형): 민트 2단계 달력 영역에 요일마다 한 칸. 칸이 영역 높이를 채우고, 넘치면 그 칸만 스크롤한다
          <div data-testid="calendar-scroll" className={`flex-1 min-h-0 rounded-lg shadow-xs ${CALENDAR_BACKGROUND[theme]} overflow-hidden`}>
            <WeekView
              weekStart={weekStart} events={savedEvents} timeBlocks={savedTimeBlocks}
              today={getTodayString()} panelDate={panel?.date ?? null}
              onOpenDay={(date, blockId = null, eventId = null) => openDayPanel(null, date, blockId, eventId)}
              onAddEvent={(date) => openNewEvent(date, 'timed')}
            />
          </div>
        ) : isMonthView ? (
          // 월 보기: 앰버 2단계 달력 영역에 한 달 (위아래로만 스크롤)
          <div data-testid="calendar-scroll" className={`flex-1 min-h-0 rounded-lg shadow-xs ${CALENDAR_BACKGROUND[theme]} overflow-y-auto`}>
            <MonthView year={currentYear} month={currentMonth} cellProps={cellProps} />
          </div>
        ) : (
        <div
          data-testid="calendar-scroll"
          className={`flex-1 min-h-0 rounded-lg shadow-xs ${CALENDAR_BACKGROUND[theme]} relative ${isWrapMode ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`}
        >
          {/* 칸 사이에 4px 틈(gap-1)을 둬서 둥근 칸들이 떠 보이게 한다. 상자 안쪽 여백은 위 4px(pt-1, 첫 연도 띠가 -mt-1로 덮음)뿐이라 좌우·아래는 칸이 상자 끝에 붙는다 */}
          <div className={`flex flex-col gap-1 pt-1 ${isWrapMode ? '' : 'min-w-max'}`}>
            {/* 기준 연도와 다음 연도를 순차적으로 렌더링 */}
            {displayYears.map((year, i) => (
              <YearSection key={year} year={year} isFirst={i === 0} isWrapMode={isWrapMode} cellProps={cellProps} />
            ))}
          </div>
        </div>
        )}
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
          onNewEvent={(kind) => openNewEvent(panel.date, kind)}
          selectedEventId={openEventId}
          onSelectEvent={selectEvent}
          onAddBlock={(block) => addTimeBlock(panel.date, block)}
          onChangeBlock={(id, changes) => changeTimeBlock(panel.date, id, changes)}
          onSelectBlock={selectBlock}
          view={panelView}
          onViewChange={setPanelView}
          changeCount={changeCount}
          onSave={() => save()}
          onRevert={revert}
          onToggleTodo={(kind, id, todoId, done) => {
            const toggle = (todos) => setTodoDone(todos, todoId, done);
            if (kind === 'event') changeEventTodos(id, toggle);
            else changeTodos(panel.date, id, toggle);
          }}
        />
      )}

      {/* --- 그 오른쪽: 고른 기간 일정의 상세 패널 (이름·기간·색·할 일·삭제). 삭제는 확인 팝업을 거친다 --- */}
      {panel && openEvent && (
        <EventPanel
          key={openEvent.id}
          event={openEvent}
          onChange={(changes) => patchEvent(openEvent.id, changes)}
          onChangeTodos={(change) => changeEventTodos(openEvent.id, change)}
          onDelete={() => openDeleteModal(openEvent)}
          onClose={() => selectEvent(null)}
          changeCount={changeCount}
          onSave={() => save()}
          onRevert={revert}
        />
      )}

      {/* --- 그 오른쪽: 고른 시간 일정 카드의 상세 패널 (이름·색·주요·삭제) --- */}
      {panel && selectedBlock && (
        <BlockPanel
          key={selectedBlock.id}
          date={panel.date}
          block={selectedBlock}
          blocks={panelBlocks}
          onChange={(changes) => changeTimeBlock(panel.date, selectedBlock.id, changes)}
          onChangeTodos={(change) => changeTodos(panel.date, selectedBlock.id, change)}
          onDelete={() => { removeTimeBlock(panel.date, selectedBlock.id); setSelectedBlockId(null); }}
          onClose={() => selectBlock(null)}
          changeCount={changeCount}
          onSave={() => save()}
          onRevert={revert}
        />
      )}

      {/* --- 그 오른쪽: 새 일정 패널 ([시간 일정 | 종일 일정], 저장해야 생긴다) --- */}
      {panel && newDraft && (
        <NewEventPanel
          key={newDraft.openCount}
          draft={newDraft}
          blocks={timeBlocks[newDraft.date] || []}
          onSave={saveNewEvent}
          onCancel={closeNewEvent}
        />
      )}

      {/* --- 저장 안 한 채 패널을 닫을 때 묻는 팝업 --- */}
      {showCloseConfirm && (
        <UnsavedCloseModal
          changeCount={changeCount}
          // [저장하고 닫기]: 열려 있던 빈 카드(이름도 할 일도 없음)는 치우고 저장한 뒤 닫는다
          onSave={() => { setShowCloseConfirm(false); save(selectedBlockId ? { date: panel.date, id: selectedBlockId } : null); closePanelNow(); }}
          onDiscard={() => { setShowCloseConfirm(false); closePanelNow(); revert(); }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {/* --- 삭제 확인 모달 --- */}
      {showDeleteModal && (
        <DeleteConfirmModal onCancel={() => setShowDeleteModal(false)} onConfirm={deleteEvent} />
      )}
      </div>
    </div>
  );
}