import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import EditIcon from '../icons/EditIcon';
import DeleteIcon from '../icons/DeleteIcon';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE } from '../../constants/colors';
import { readableTextOn } from '../../utils/color';
import { daysBetween, formatLongDate, formatShortDate } from '../../utils/date';
import { blocksToSlots, makeBlockId, slotsToBlocks } from '../../utils/timeBlocks';

const pad = (n) => String(n).padStart(2, '0');

// 기간 일정이면 "1/5–1/7 · 2/3일째", 하루짜리면 "종일"
function rangeLabel(evt, date) {
  if (evt.start_date === evt.end_date) return '종일';
  const total = daysBetween(evt.start_date, evt.end_date) + 1;
  const nth = daysBetween(evt.start_date, date) + 1;
  return `${formatShortDate(evt.start_date)}–${formatShortDate(evt.end_date)} · ${nth}/${total}일째`;
}

// 처음 열 때 24줄을 만든다. 빈 줄에도 미리 id를 붙여 두어, 자동 저장 때 글자를 칠 때마다 카드 id가 바뀌지 않게 한다.
const initialSlots = (blocks) =>
  blocksToSlots(blocks, COLOR_PALETTE[0].value).map((slot) => (slot.id ? slot : { ...slot, id: makeBlockId() }));

// 날짜를 누르면 화면 오른쪽에 열리는 그날의 일정 패널. 왼쪽 달력은 계속 보인다.
//   ① 머리말: 날짜, 전날/다음 날, 닫기
//   ② 이 날의 일정: 그날에 걸친 기간·종일 일정 목록
//   ③ 종일 일정 추가: 이름 + 색
//   ④ 시간 일정: 0~23시 24줄 (입력하는 즉시 저장)
// 날짜가 바뀌면 부모가 key를 바꿔 이 부품을 새로 그린다. (입력 중이던 줄 상태가 다른 날짜로 넘어가지 않게)
//
//   dayEvents   그날에 걸친 기간·종일 일정 목록
//   blocks      그날의 시간 일정 카드 목록
//   focusHour   시간 일정을 눌러 열었으면 그 시간(0~23). 그 줄로 스크롤해 강조하고 커서를 둔다.
export default function DayPanel({
  date, dayEvents, blocks, focusHour = null,
  onClose, onMoveDay,
  onAddAllDay, onEditEvent, onDeleteEvent,
  onSaveBlocks,
}) {
  const [slots, setSlots] = useState(() => initialSlots(blocks));
  const [allDayTitle, setAllDayTitle] = useState('');
  const [allDayColor, setAllDayColor] = useState(COLOR_PALETTE[0].value);

  const headingRef = useRef(null);
  const focusInputRef = useRef(null);

  // 열리면(또는 날짜가 바뀌면) 커서를 옮긴다: 시간 일정을 눌러 열었으면 그 줄, 아니면 패널 제목.
  // 키보드·화면 낭독기 사용자가 패널이 열린 것을 바로 알 수 있게 한다.
  useEffect(() => {
    const input = focusInputRef.current;
    if (input) {
      input.parentElement.scrollIntoView?.({ block: 'center' }); // 시험 환경(jsdom)에는 scrollIntoView가 없어서 ?.
      input.focus();
    } else {
      headingRef.current?.focus();
    }
  }, []);

  // 한 줄을 바꾸면 화면의 줄 상태를 고치고, 곧바로 카드 목록으로 바꿔 저장한다.
  const changeSlot = (hour, field, value) => {
    const next = slots.map((slot) => (slot.hour === hour ? { ...slot, [field]: value } : slot));
    setSlots(next);
    onSaveBlocks(slotsToBlocks(next, blocks));
  };

  const addAllDay = () => {
    if (!allDayTitle.trim()) return;
    onAddAllDay({ title: allDayTitle.trim(), color: allDayColor });
    setAllDayTitle('');
  };

  return (
    <aside
      aria-label="상세 일정 관리"
      className="w-[380px] shrink-0 border-l border-border bg-card sticky top-0 h-screen overflow-y-auto flex flex-col"
    >
      <header className="flex items-center gap-1 px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
        <Button variant="ghost" size="icon-sm" aria-label="전날" onClick={() => onMoveDay(-1)}><ChevronLeft /></Button>
        <h2 ref={headingRef} tabIndex={-1} className="flex-1 text-center text-base font-semibold text-foreground focus:outline-hidden">
          {formatLongDate(date)}
        </h2>
        <Button variant="ghost" size="icon-sm" aria-label="다음 날" onClick={() => onMoveDay(1)}><ChevronRight /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="닫기" onClick={onClose} className="ml-1"><X /></Button>
      </header>

      <div className="flex flex-col gap-6 px-4 py-4">
        <section aria-labelledby="day-panel-events">
          <h3 id="day-panel-events" className="text-sm font-semibold text-foreground mb-2">
            이 날의 일정 <span className="font-normal text-muted-foreground text-xs ml-1">{dayEvents.length}개</span>
          </h3>
          <ul className="flex flex-col gap-1.5">
            {dayEvents.map((evt) => (
              <li
                key={evt.id}
                style={{ backgroundColor: evt.color, color: readableTextOn(evt.color) }}
                className="text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-2 font-medium min-w-0"
              >
                <span className="truncate flex-1">{evt.title}</span>
                <span className="shrink-0 font-normal opacity-90">{rangeLabel(evt, date)}</span>
                <button onClick={() => onEditEvent(evt)} aria-label={`${evt.title} 수정`} className="opacity-80 hover:opacity-100 shrink-0"><EditIcon /></button>
                <button onClick={() => onDeleteEvent(evt)} aria-label={`${evt.title} 삭제`} className="opacity-60 hover:opacity-100 shrink-0"><DeleteIcon /></button>
              </li>
            ))}
          </ul>
          {dayEvents.length === 0 && (
            <p className="text-xs text-muted-foreground">이 날에 걸친 기간·종일 일정이 없어요.</p>
          )}
        </section>

        <section aria-labelledby="day-panel-add" className="border-t border-border pt-5">
          <h3 id="day-panel-add" className="text-sm font-semibold text-foreground mb-2">종일 일정 추가</h3>
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
              <Button type="submit" variant="outline" size="sm">추가</Button>
            </div>
            <ColorPicker size="md" label="종일 일정 색" value={allDayColor} onChange={setAllDayColor} />
          </form>
        </section>

        <section aria-labelledby="day-panel-times" className="border-t border-border pt-5">
          <div className="flex justify-between items-end mb-2">
            <h3 id="day-panel-times" className="text-sm font-semibold text-foreground">시간 일정</h3>
            <span className="text-[10px] text-muted-foreground">입력하면 바로 저장 · 체크하면 달력에 ★</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {slots.map((item) => {
              const time = `${pad(item.hour)}:00`;
              return (
                <div key={item.hour} className={`flex gap-2 items-center p-1 rounded-sm border ${item.hour === focusHour ? 'bg-accent border-primary' : 'bg-card border-transparent hover:bg-muted hover:border-border'}`}>
                  <span className="text-xs font-medium text-muted-foreground w-10 text-right shrink-0">{time}</span>
                  <input
                    ref={item.hour === focusHour ? focusInputRef : undefined}
                    type="text" placeholder="내용 입력" aria-label={`${time} 일정 내용`} value={item.content}
                    onChange={(e) => changeSlot(item.hour, 'content', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-border rounded-sm text-sm focus:outline-hidden focus:border-ring min-w-0"
                  />
                  <ColorPicker size="sm" label={`${time} 일정 색`} value={item.color} onChange={(color) => changeSlot(item.hour, 'color', color)} />
                  <label className="flex items-center gap-1 cursor-pointer justify-end shrink-0">
                    <input
                      type="checkbox" aria-label={`${time} 주요 일정 (★ 표시)`} checked={item.is_important}
                      onChange={(e) => changeSlot(item.hour, 'is_important', e.target.checked)}
                      className="w-3.5 h-3.5 text-primary rounded-sm border-input"
                    />
                    <span className="text-[10px] text-muted-foreground font-medium">주요</span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
