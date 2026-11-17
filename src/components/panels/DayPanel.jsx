import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE } from '../../constants/colors';
import { eventColors } from '../../utils/color';
import { daysBetween, formatLongDate, formatShortDate } from '../../utils/date';
import { SLOTS_PER_DAY, isRangeFree, makeTimeBlock, slotToTime, sortBlocks } from '../../utils/timeBlocks';
import { todoProgress, todosOf } from '../../utils/todos';
import StarIcon from '../icons/StarIcon';
import TodoCount from '../common/TodoCount';
import TimeGrid from './TimeGrid';
import DayTodos from './DayTodos';
import SelectBox from '../common/SelectBox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SLOT_OPTIONS = Array.from({ length: SLOTS_PER_DAY + 1 }, (_, slot) => slot); // 0(00:00) ~ 48(24:00)

// 기간 일정이면 "1/5–1/7 · 2/3일째", 하루짜리면 "종일"
function rangeLabel(evt, date) {
  if (evt.start_date === evt.end_date) return '종일';
  const total = daysBetween(evt.start_date, evt.end_date) + 1;
  const nth = daysBetween(evt.start_date, date) + 1;
  return `${formatShortDate(evt.start_date)}–${formatShortDate(evt.end_date)} · ${nth}/${total}일째`;
}

// 날짜를 누르면 화면 오른쪽에 열리는 그날의 일정 패널. 왼쪽 달력은 계속 보인다.
//   ① 머리말: 날짜, 전날/다음 날, 닫기
//   ② 일정: 그날의 기간·종일 일정과 시간 일정을 한 목록으로 (누르면 오른쪽에 기간 일정 상세 / 카드 상세 패널)
//      [목록 | 시간표] 스위치(view)로 보는 방식을 바꾼다.
//        목록: 한 줄 목록 + 종일 일정 추가(이름 + 색)
//        시간표: 종일 줄 + 0~24시 30분 칸 시간표. 빈 칸을 끌면 카드가 생기고, 카드를 누르면 오른쪽에 카드 상세 패널이 열린다.
// 날짜가 바뀌면 부모가 key를 바꿔 이 부품을 새로 그린다. (입력 중이던 상태가 다른 날짜로 넘어가지 않게)
//
//   dayEvents         그날에 걸친 기간·종일 일정 목록
//   blocks            그날의 시간 일정 카드 목록
//   selectedBlockId   카드 상세 패널에 열린 카드
//   view, onViewChange(view)  일정 보기 방식 'list' | 'timetable'
//   onToggleTodo(kind, sourceId, todoId, done)  할 일 구역에서 체크를 바꿨을 때. kind는 'event'(기간 일정) | 'block'(시간 카드)
//   onAddBlock(block) 새 카드 저장,  onChangeBlock(id, changes) 카드 시각 등 고치기,  onSelectBlock(id) 카드 고르기(상세 패널 열기)
export default function DayPanel({
  date, dayEvents, blocks, selectedBlockId = null,
  onClose, onMoveDay,
  onAddAllDay, selectedEventId = null, onSelectEvent,
  onAddBlock, onChangeBlock, onSelectBlock,
  view = 'list', onViewChange,
  onToggleTodo,
}) {
  const [allDayTitle, setAllDayTitle] = useState('');
  const [allDayColor, setAllDayColor] = useState(COLOR_PALETTE[0].value);
  // 키보드로 추가하기: 시작·끝 칸 번호 (처음에는 09:00~10:00)
  const [addStart, setAddStart] = useState(18);
  const [addEnd, setAddEnd] = useState(20);
  const [addError, setAddError] = useState('');

  const headingRef = useRef(null);

  // 열리면(또는 날짜가 바뀌면) 커서를 패널 제목으로 옮긴다. 키보드·화면 낭독기 사용자가 패널이 열린 것을 바로 알 수 있게 한다.
  // (카드를 눌러 열었으면 오른쪽 카드 상세 패널이 뒤이어 이름 입력칸으로 커서를 가져간다)
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // [start, end) 칸에 새 카드를 만들고 곧바로 골라서, 카드 상세 패널에서 이름을 쓰게 한다.
  const createBlock = (start, end) => {
    const block = makeTimeBlock(start, end, COLOR_PALETTE[0].value);
    onAddBlock(block);
    onSelectBlock(block.id);
  };

  const changeAddStart = (value) => {
    setAddStart(value);
    if (addEnd <= value) setAddEnd(value + 1); // 끝은 늘 시작보다 뒤
    setAddError('');
  };

  const addByKeyboard = () => {
    if (!isRangeFree(blocks, addStart, addEnd)) {
      setAddError('이미 있는 시간 일정과 겹쳐요. 다른 시각을 골라 주세요.');
      return;
    }
    setAddError('');
    createBlock(addStart, addEnd);
  };

  const addAllDay = () => {
    if (!allDayTitle.trim()) return;
    onAddAllDay({ title: allDayTitle.trim(), color: allDayColor });
    setAllDayTitle('');
  };

  // 기간·종일 일정 한 줄 (목록 모드와 시간표 모드의 "종일" 줄이 함께 쓴다)
  const eventRow = (evt) => {
    const colors = eventColors(evt.color);
    return (
      <li key={evt.id} className="flex items-center gap-2">
        <span className="w-11 shrink-0 text-xs text-muted-foreground">{evt.start_date === evt.end_date ? '종일' : '기간'}</span>
        {/* 띠 전체가 버튼: 누르면 오른쪽에 기간 일정 상세 패널이 열린다. 열린 일정은 테두리로 표시 */}
        <button
          type="button"
          aria-pressed={evt.id === selectedEventId}
          onClick={() => onSelectEvent(evt.id)}
          style={{ backgroundColor: colors.background, color: colors.text }}
          className={`flex-1 text-left text-[13px] px-2.5 py-1.5 rounded-sm flex items-center gap-2 font-semibold min-w-0 cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring ${evt.id === selectedEventId ? 'ring-2 ring-inset ring-primary' : ''}`}
        >
          <span className="truncate flex-1">{evt.title}</span>
          <span className="shrink-0 font-normal opacity-90">{rangeLabel(evt, date)}</span>
        </button>
      </li>
    );
  };

  // 시간 일정 한 줄 (목록 모드)
  const blockRow = (block) => {
    const colors = eventColors(block.color);
    const name = block.content.trim() || '제목 없음';
    const todos = todoProgress(todosOf(block));
    return (
      <li key={block.id} className="flex items-center gap-2">
        <span className="w-11 shrink-0 text-xs text-muted-foreground">{block.start}</span>
        {/* 시간 일정 줄: 누르면 오른쪽에 카드 상세 패널이 열린다 (시간표의 카드를 누를 때와 같다).
            접근성 이름은 이름부터 읽는다 (시간표 카드는 시각부터 읽어서 둘이 구분된다) */}
        <button
          type="button"
          aria-label={`${name} ${block.start}–${block.end}${block.is_important ? ' (주요)' : ''}${todos.total ? `, 할 일 ${todos.total}개 중 ${todos.done}개 완료` : ''}`}
          aria-pressed={block.id === selectedBlockId}
          onClick={() => onSelectBlock(block.id)}
          style={{ backgroundColor: colors.background, color: colors.text }}
          className={`flex-1 text-left text-[13px] px-2.5 py-1.5 rounded-sm flex items-center gap-2 font-semibold min-w-0 cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring ${block.id === selectedBlockId ? 'ring-2 ring-inset ring-primary' : ''}`}
        >
          {block.is_important && <span aria-hidden="true" className="shrink-0"><StarIcon /></span>}
          <span className={`truncate flex-1 ${block.content.trim() ? '' : 'opacity-70'}`}>{name}</span>
          {todos.total > 0 && (
            <span aria-hidden="true" className="shrink-0 rounded-full bg-card px-1.5 text-xs leading-[18px]">
              <TodoCount done={todos.done} total={todos.total} aria-label={undefined} />
            </span>
          )}
        </button>
      </li>
    );
  };

  const isTimetable = view === 'timetable';

  // "할 일" 구역에 모을 할 일: 기간·종일 일정의 것 먼저, 그다음 시간 카드의 것(시작 시각 순서). 일정 안에서는 적은 순서대로.
  const todoItems = [
    ...dayEvents.flatMap((evt) => todosOf(evt).map((todo) => ({ key: `event-${evt.id}-${todo.id}`, kind: 'event', sourceId: evt.id, todo, sourceName: evt.title, color: evt.color }))),
    ...sortBlocks(blocks).flatMap((block) => todosOf(block).map((todo) => ({ key: `block-${block.id}-${todo.id}`, kind: 'block', sourceId: block.id, todo, sourceName: block.content.trim() || '제목 없음', color: block.color }))),
  ];
  const todoSection = (
    <DayTodos
      items={todoItems}
      compact={isTimetable}
      onToggle={(item, done) => onToggleTodo(item.kind, item.sourceId, item.todo.id, done)}
    />
  );

  return (
    <aside
      aria-label="상세 일정 관리"
      // 너비 460px. 위쪽은 왼쪽 연도 카드처럼 화면 가장자리에서 24px, 오른쪽은 왼쪽 여백과 같은 12px, 아래쪽은 12px 떨어진다 (아래를 24px 띄우면 패널이 짧아 보여서 절반으로).
      // 네 모서리 모두 둥글다(15px). 스크롤해도 그 자리에 머물고(sticky top-6), 높이는 화면 높이에서 위 24px + 아래 12px을 뺀 만큼이다.
      className="w-[460px] shrink-0 self-start sticky top-6 mt-6 mb-3 mr-3 h-[calc(100vh-36px)] rounded-lg border border-border bg-card shadow-xs overflow-y-auto flex flex-col"
    >
      {/* 머리말과 "일정" 제목 줄([목록 | 시간표] 스위치)은 패널을 스크롤해도 위에 붙어 있다 */}
      <div data-testid="day-panel-pinned" className="sticky top-0 z-10 bg-card border-b border-border">
        <header className="flex items-center gap-1 px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon-sm" aria-label="전날" onClick={() => onMoveDay(-1)}><ChevronLeft /></Button>
          <h2 ref={headingRef} tabIndex={-1} className="flex-1 text-center text-base font-semibold text-foreground focus:outline-hidden">
            {formatLongDate(date)}
          </h2>
          <Button variant="ghost" size="icon-sm" aria-label="다음 날" onClick={() => onMoveDay(1)}><ChevronRight /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="닫기" onClick={onClose} className="ml-1"><X /></Button>
        </header>
        <div className="flex items-center gap-2 px-4 py-2.5">
          <h3 id="day-panel-events" className="text-sm font-semibold text-foreground">
            일정 <span className="font-normal text-muted-foreground text-xs ml-1">{dayEvents.length + blocks.length}개</span>
          </h3>
          {/* 일정 보기 방식: 목록(한 줄씩) / 시간표(30분 칸). 고른 값은 날짜를 넘겨도 유지된다(App이 들고 있다) */}
          <Tabs value={view} onValueChange={onViewChange} className="ml-auto">
            <TabsList aria-label="일정 보기 방식" className="bg-surface-blue-2">
              <TabsTrigger value="list" className="px-3">목록</TabsTrigger>
              <TabsTrigger value="timetable" className="px-3">시간표</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* "일정" 구역: 패널의 남은 높이를 채운다(flex-1). min-h-0이 있어야 남은 높이에 맞춰져서 시간표가 그 안에서 따로 스크롤된다 */}
      <section aria-labelledby="day-panel-events" className="flex-1 min-h-0 flex flex-col gap-5 px-4 py-3">
        {!isTimetable && (
          <>
            {/* 목록: 그날의 모든 일정을 한 목록으로. 위에는 기간·종일 일정, 아래에는 시간 일정(시작 시각 순서).
                줄마다 왼쪽에 시각 칸(종일 / 기간 / 09:00), 오른쪽에 일정 색 막대 */}
            <div className="shrink-0">
              <ul aria-label="일정 목록" className="flex flex-col gap-1.5">
                {dayEvents.map(eventRow)}
                {sortBlocks(blocks).map(blockRow)}
              </ul>
              {dayEvents.length + blocks.length === 0 && (
                <p className="text-xs text-muted-foreground">이 날의 일정이 없어요.</p>
              )}
            </div>

            {todoSection}

            <section aria-labelledby="day-panel-add" className="shrink-0 border-t border-border pt-4">
              <h4 id="day-panel-add" className="text-sm font-semibold text-foreground mb-2">종일 일정 추가</h4>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => { e.preventDefault(); addAllDay(); }}
              >
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="예: 워크숍 일정" aria-label="종일 일정명" value={allDayTitle}
                    onChange={(e) => setAllDayTitle(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
                  />
                  {/* 바탕은 파랑 2단계 (secondary 토큰 = #E4E5FF) */}
                  <Button type="submit" variant="secondary" size="sm">추가</Button>
                </div>
                <ColorPicker size="md" label="종일 일정 색" value={allDayColor} onChange={setAllDayColor} />
              </form>
            </section>
          </>
        )}

        {isTimetable && (
          <div className="flex-1 min-h-[320px] flex flex-col">
            {/* 종일 줄: 기간·종일 일정은 시간표 위에 따로 둔다 (시간표를 스크롤해도 늘 보인다) */}
            {dayEvents.length > 0 && (
              <ul aria-label="종일 일정" className="flex flex-col gap-1.5 mb-3 shrink-0">
                {dayEvents.map(eventRow)}
              </ul>
            )}

            {/* 마우스 없이 만들기: 시작·끝 시각을 고르고 추가 */}
            <form
              aria-label="시간 일정 추가"
              className="flex items-center gap-1.5 mb-1 text-xs"
              onSubmit={(e) => { e.preventDefault(); addByKeyboard(); }}
            >
              <SelectBox
                aria-label="시작 시각" value={addStart}
                onChange={(e) => changeAddStart(Number(e.target.value))}
              >
                {SLOT_OPTIONS.slice(0, SLOTS_PER_DAY).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
              </SelectBox>
              <span className="text-muted-foreground">~</span>
              <SelectBox
                aria-label="끝 시각" value={addEnd}
                onChange={(e) => { setAddEnd(Number(e.target.value)); setAddError(''); }}
              >
                {SLOT_OPTIONS.slice(addStart + 1).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
              </SelectBox>
              <Button type="submit" variant="secondary" size="sm" className="ml-auto">추가</Button>
            </form>
            {addError && <p role="alert" className="text-xs text-destructive mb-1">{addError}</p>}
            <p className="text-[10px] text-muted-foreground mb-1">빈 칸을 끌어 만들기 · 카드를 끌어 옮기기 · 위아래 끝을 끌어 길이 바꾸기</p>

            <TimeGrid
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onCreate={createBlock}
              onChangeTime={(id, start, end) => onChangeBlock(id, { start: slotToTime(start), end: slotToTime(end) })}
              onSelect={onSelectBlock}
            />
          </div>
        )}
        {isTimetable && todoSection}
      </section>
    </aside>
  );
}
