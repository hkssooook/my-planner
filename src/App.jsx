import { useEffect, useState } from 'react';

import { PAGE_BACKGROUND } from './constants/themes';
import { getNowTime, getTodayString } from './utils/date';
import { setTodoDone } from './utils/todos';
import usePlannerData from './hooks/usePlannerData';
import usePanels from './hooks/usePanels';
import useCalendarNav from './hooks/useCalendarNav';
import TopBar from './components/layout/TopBar';
import { Button } from '@/components/ui/button';
import SummaryRow from './components/layout/SummaryRow';
import { summarize, summaryRange } from './utils/summary';
import CalendarArea from './components/calendar/CalendarArea';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import UnsavedCloseModal from './components/modals/UnsavedCloseModal';
import DayPanel from './components/panels/DayPanel';
import BlockPanel from './components/panels/BlockPanel';
import EventPanel from './components/panels/EventPanel';
import NewEventPanel from './components/panels/NewEventPanel';

// account = { email, onSignOut }: 로그인한 사람 (main.jsx의 AuthGate가 넘긴다). 시험처럼 없으면 상단 바에 계정 칸을 그리지 않는다.
// initialData, persist: 수파베이스에서 읽어 온 일정과 수파베이스에 쓰는 함수 (main.jsx의 PlannerLoader가 넘긴다).
//   없으면(시험 등) 브라우저 저장소를 쓴다. (usePlannerData 설명 참고)
export default function App({ account = null, initialData = null, persist = null }) {
  // events·timeBlocks는 "고치는 중인 것"(패널에 보임), savedEvents·savedTimeBlocks는 "저장된 것"(달력에 보임).
  // 패널에서 고친 내용은 일정 패널의 [저장]을 눌러야 저장되고 달력에 반영된다. (usePlannerData 설명 참고)
  const data = usePlannerData({ initialData, persist });
  const {
    timeBlocks, savedEvents, savedTimeBlocks, changeCount, save, revert, saveFailed, retrySave,
    patchEvent, changeEventTodos, addTimeBlock, changeTimeBlock, changeTodos,
  } = data;

  // 오른쪽 패널들과 확인 팝업이 언제 열리고 닫히는지 (usePanels 설명 참고)
  const panels = usePanels(data);
  const {
    panel, panelEvents, panelBlocks, selectedBlockId, selectedBlock, openEventId, openEvent, newDraft, drag,
    openDayPanel, openNewEvent, closeConfirm, deleteConfirm,
  } = panels;

  // 달력에서 지금 어디를 보고 있나: 보기(연·월·주)와 보는 해·달·주 (useCalendarNav 설명 참고)
  const nav = useCalendarNav();
  const { view, theme, thisYear, currentYear, currentMonth, weekStart } = nav;

  // 연 보기의 가로 스크롤 / 화면 맞춤
  const [isWrapMode, setIsWrapMode] = useState(false);
  // 일정 패널의 보기 방식: 'list'(목록) | 'timetable'(시간표). 날짜를 넘기거나 패널을 다시 열어도 고른 값을 유지한다
  const [panelView, setPanelView] = useState('list');

  // 상단 바의 "오늘": 올해로 돌아가 오늘 날짜 칸을 누른 것처럼 오늘의 일정 패널을 열고(칸에 테두리),
  // 달력 상자를 오늘 칸이 가운데 오도록 스크롤한다.
  // 연도가 바뀌거나 패널이 열리면 달력이 다시 그려진 뒤에 칸을 찾아야 하므로, 다음 화면 그리기 때(requestAnimationFrame) 스크롤한다.
  const goToToday = () => {
    const today = getTodayString();
    nav.jumpToToday(today);
    openDayPanel(null, today);
    requestAnimationFrame(() => {
      const cell = document.querySelector(`[data-date="${today}"]`);
      cell?.scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'smooth' });
    });
  };

  // 저장 안 한 변경이 있거나 수파베이스 저장에 실패했으면, 창을 닫거나 새로 고칠 때 브라우저가 "사이트에서 나가시겠습니까?"로 한 번 막는다
  const hasUnsaved = changeCount > 0 || saveFailed;
  useEffect(() => {
    if (!hasUnsaved) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  // 로그아웃: 저장 안 한 변경이 있으면 사라지므로 한 번 묻는다
  const signOut = () => {
    if (changeCount > 0 && !window.confirm(`저장 안 한 변경 ${changeCount}개가 사라져요. 그래도 로그아웃할까요?`)) return;
    if (saveFailed && !window.confirm('마지막 저장이 수파베이스에 올라가지 않았어요. 그래도 로그아웃할까요?')) return;
    account.onSignOut();
  };

  // 요약 줄의 범위(from~to)와 이름(scope). 보기에 따라 그 해·그달·그 주 (utils/summary.js)
  const { from: summaryFrom, to: summaryTo, scope: summaryScope } = summaryRange({
    view, year: currentYear, month: currentMonth, weekStart, today: getTodayString(), thisYear,
  });

  return (
    // 화면 짜임: 맨 위 상단 바(화면 전체 폭) 아래에 한 줄로 [달력 상자] [일정 패널] [두 번째 패널]이 나란히 선다.
    // 그래서 달력과 패널들은 같은 높이에서 시작해 같은 높이에서 끝난다. 달력은 패널이 열려도 계속 보인다.
    // 화면 전체는 화면 높이에 딱 맞고 스크롤되지 않는다(h-screen overflow-hidden). 스크롤은 달력 상자와 패널이 각자 안에서 한다.
    // 화면 바깥 여백: 위 24px(pt-6), 좌우·아래 12px(px-3 pb-3). 상단 바와 아래 줄 사이, 줄 안의 상자 사이는 모두 12px.
    // 화면 바탕은 보기 색 5단계 (constants/themes.js의 PAGE_BACKGROUND)
    <div className={`flex flex-col ${PAGE_BACKGROUND[theme]} h-screen overflow-hidden px-3 pt-6 pb-3`}>
      {/* 상단 바: 기간 캡슐 · 연·월·주 탭 · 화면 맞춤 · 새 일정 */}
      <TopBar
        nav={nav}
        isWrapMode={isWrapMode}
        onWrapModeChange={setIsWrapMode}
        onToday={goToToday}
        // 새 일정: 열린 날(없으면 오늘)의 일정 패널 + 새 일정 패널(시간 일정)
        onNewEvent={() => openNewEvent(panel?.date ?? getTodayString(), 'timed')}
        account={account && { email: account.email, onSignOut: signOut }}
      />

      {/* 수파베이스 저장 실패 안내: 인터넷이 끊겼을 때 등. [다시 저장]은 달력에 보이는 "저장된 것"을 다시 보낸다 */}
      {saveFailed && (
        <div role="alert" className="mb-3 shrink-0 flex items-center gap-3 rounded-xl bg-card px-4 py-2 text-sm text-destructive">
          <span className="flex-1">저장하지 못했어요. 인터넷 연결을 확인하고 다시 저장해 주세요.</span>
          <Button variant="destructive" className="rounded-full" onClick={retrySave}>다시 저장</Button>
        </div>
      )}

      {/* 요약 줄: 지금 보는 범위의 할 일 · 7일 이내 주요 일정 · 못 끝낸 일 (저장된 일정 기준) */}
      {/* 범위만 보기에 따라 바뀐다: 연 = 그 해, 월 = 그달 */}
      <SummaryRow
        scope={summaryScope}
        summary={summarize({ events: savedEvents, timeBlocks: savedTimeBlocks, from: summaryFrom, to: summaryTo, today: getTodayString(), now: getNowTime() })}
      />

      {/* 아래 한 줄: 남은 높이를 모두 쓰고, 달력 상자와 패널들이 같은 높이로 선다 */}
      <div className="flex-1 min-h-0 flex gap-3">
      {/* 달력: 보기에 따라 연·월·주 (저장된 것을 보여 준다) */}
      <CalendarArea
        nav={nav}
        isWrapMode={isWrapMode}
        events={savedEvents}
        timeBlocks={savedTimeBlocks}
        drag={drag}
        panelDate={panel?.date ?? null}
        onOpenDay={openDayPanel}
        onAddEvent={(date) => openNewEvent(date, 'timed')}
      />

      {/* --- 오른쪽 일정 패널 (이 날의 일정 + 시간 일정) --- */}
      {panel && (
        <DayPanel
          key={`${panel.date}-${panel.openCount}`}
          date={panel.date}
          dayEvents={panelEvents}
          blocks={panelBlocks}
          selectedBlockId={selectedBlockId}
          onClose={panels.closeDayPanel}
          onMoveDay={panels.moveDayPanel}
          onNewEvent={(kind) => openNewEvent(panel.date, kind)}
          selectedEventId={openEventId}
          onSelectEvent={panels.selectEvent}
          onAddBlock={(block) => addTimeBlock(panel.date, block)}
          onChangeBlock={(id, changes) => changeTimeBlock(panel.date, id, changes)}
          onSelectBlock={panels.selectBlock}
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
          onDelete={() => deleteConfirm.ask(openEvent)}
          onClose={() => panels.selectEvent(null)}
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
          onDelete={panels.deleteSelectedBlock}
          onClose={() => panels.selectBlock(null)}
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
          onSave={panels.saveNewEvent}
          onCancel={panels.closeNewEvent}
        />
      )}

      {/* --- 저장 안 한 채 패널을 닫을 때 묻는 팝업 --- */}
      {closeConfirm.open && (
        <UnsavedCloseModal
          changeCount={changeCount}
          onSave={closeConfirm.saveAndClose}
          onDiscard={closeConfirm.discardAndClose}
          onCancel={closeConfirm.cancel}
        />
      )}

      {/* --- 삭제 확인 모달 --- */}
      {deleteConfirm.open && (
        <DeleteConfirmModal onCancel={deleteConfirm.cancel} onConfirm={deleteConfirm.confirm} />
      )}
      </div>
    </div>
  );
}