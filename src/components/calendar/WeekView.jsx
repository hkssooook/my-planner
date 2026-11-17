import { useEffect, useRef, useState } from 'react';
import DayCell from './DayCell';
import StarIcon from '../icons/StarIcon';
import TodoCount from '../common/TodoCount';
import { ROW } from '../panels/TimeGrid';
import { DAY_NAMES } from '../../constants/calendar';
import { addDays } from '../../utils/date';
import { eventColors } from '../../utils/color';
import { SLOTS_PER_DAY, blockSlotRange, slotToTime } from '../../utils/timeBlocks';
import { todoProgress, todosOf } from '../../utils/todos';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const FIRST_VISIBLE_SLOT = 16; // 처음 열면 08:00 근처가 보이게 스크롤한다

// 주 보기: 일요일부터 토요일까지 한 주. (리디자인 기획서 ③ 달력 영역 "주 = 한 칸이 하루 + 시간표")
//   위쪽: 날짜 칸 7개 (연·월 보기와 같은 DayCell, 기간·종일 일정과 할 일 알약만). 스크롤해도 위에 붙어 있다.
//   아래쪽: 7일 시간표 (1시간 = 40px, 30분 점선). 저장된 시간 일정이 카드로 놓이고, 오늘 칸에는 지금 시각 선.
//     - 카드를 누르면 그날 일정 패널과 그 카드의 상세 패널이 열린다 (onOpenBlock)
//     - 빈 칸을 위아래로 끌면 그날·그 시간으로 새 일정 패널이 열린다 (onCreate). 저장해야 생긴다.
//     - 카드를 끌어 옮기거나 길이를 바꾸는 일은 일정 패널의 시간표에서 한다.
//
//   weekStart   그 주 일요일 'YYYY-MM-DD'
//   cellProps   위쪽 날짜 칸에 넘길 값 묶음 (App의 cellProps)
//   timeBlocks  저장된 시간 카드 (달력과 같은 "저장된 것")
//   today       오늘 'YYYY-MM-DD'
//   onOpenBlock(date, id),  onCreate(date, startSlot, endSlot)
export default function WeekView({ weekStart, cellProps, timeBlocks, today, onOpenBlock, onCreate }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [drag, setDrag] = useState(null); // 끄는 중인 범위 { date, anchor, target }
  const gridTopRef = useRef(null);
  const detachRef = useRef(null);
  useEffect(() => () => detachRef.current?.(), []);

  // 처음 열 때(그리고 주가 바뀔 때) 08:00 근처가 보이게 스크롤한다
  useEffect(() => {
    const box = gridTopRef.current?.closest('[data-testid="calendar-scroll"]');
    if (box) box.scrollTop = FIRST_VISIBLE_SLOT * ROW;
  }, [weekStart]);

  // 화면의 세로 위치 → 칸 번호 (0~47)
  const slotAt = (column, clientY) => {
    const top = column.getBoundingClientRect().top;
    return Math.min(SLOTS_PER_DAY - 1, Math.max(0, Math.floor((clientY - top) / ROW)));
  };

  // 빈 칸을 누르면 끌기 시작. 놓으면 [작은 칸, 큰 칸 + 1) 범위로 새 일정 패널을 연다
  const startDrag = (e, date) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return; // 카드 위에서는 시작하지 않는다
    e.preventDefault();
    const column = e.currentTarget;
    const anchor = slotAt(column, e.clientY);
    let target = anchor;
    setDrag({ date, anchor, target });
    const move = (ev) => { target = slotAt(column, ev.clientY); setDrag({ date, anchor, target }); };
    const up = (ev) => {
      detach();
      if (typeof ev.clientY === 'number') target = slotAt(column, ev.clientY);
      setDrag(null);
      onCreate(date, Math.min(anchor, target), Math.max(anchor, target) + 1);
    };
    const detach = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      detachRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    detachRef.current = detach;
  };

  const now = new Date();
  const nowTop = (now.getHours() * 60 + now.getMinutes()) / 30 * ROW;

  return (
    <div ref={gridTopRef} className="flex flex-col">
      {/* 위쪽: 요일 + 날짜 칸. 시간표를 스크롤해도 붙어 있다 */}
      <div className="sticky top-0 z-20 bg-surface-mint-2 p-1 pb-2 grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-1">
        <span className="self-end pb-1 text-[11px] text-muted-foreground text-right pr-1">종일</span>
        {days.map((date, i) => (
          <div key={date} className="flex flex-col gap-1 min-w-0">
            <span aria-hidden="true" className={`text-center text-xs font-semibold ${i === 0 || i === 6 ? 'text-holiday' : 'text-foreground'}`}>{DAY_NAMES[i]}</span>
            {(() => {
              const [y, m, d] = date.split('-').map(Number);
              return <DayCell year={y} month={m} day={d} isWrapMode allDayOnly {...cellProps} />;
            })()}
          </div>
        ))}
      </div>

      {/* 아래쪽: 7일 시간표 */}
      <div data-testid="week-grid" className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-1 px-1 pb-2 pt-2">
        {/* 왼쪽 시각 글자 */}
        <div aria-hidden="true" className="relative" style={{ height: SLOTS_PER_DAY * ROW }}>
          {HOURS.map((hour) => (
            <span key={hour} className="absolute right-1.5 -translate-y-1/2 text-[10px] font-medium text-foreground" style={{ top: hour * 2 * ROW }}>
              {slotToTime(hour * 2)}
            </span>
          ))}
        </div>

        {days.map((date) => {
          const blocks = timeBlocks[date] || [];
          const preview = drag?.date === date ? [Math.min(drag.anchor, drag.target), Math.max(drag.anchor, drag.target) + 1] : null;
          return (
            <div
              key={date}
              data-testid={`week-column-${date}`}
              onMouseDown={(e) => startDrag(e, date)}
              className="relative rounded-sm bg-card select-none cursor-crosshair"
              style={{
                height: SLOTS_PER_DAY * ROW,
                // 정각 실선 + 30분 점선 대신 옅은 줄 (칸이 많아 점선은 어지러워서 정각만)
                backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${ROW * 2}px)`,
                boxShadow: date === today ? 'inset 0 0 0 2px var(--primary)' : undefined,
              }}
            >
              {preview && (
                <div
                  data-testid="week-preview"
                  className="absolute inset-x-1 rounded-sm border border-primary bg-primary/15 px-1 text-[11px] font-medium text-primary pointer-events-none"
                  style={{ top: preview[0] * ROW + 1, height: (preview[1] - preview[0]) * ROW - 1 }}
                >
                  {slotToTime(preview[0])}–{slotToTime(preview[1])}
                </div>
              )}

              {blocks.map((block) => {
                const [start, end] = blockSlotRange(block);
                const colors = eventColors(block.color);
                const name = block.content.trim() || '제목 없음';
                const todos = todoProgress(todosOf(block));
                return (
                  <button
                    key={block.id}
                    type="button"
                    aria-label={`${date} ${block.start}–${block.end} ${name}${block.is_important ? ' (주요)' : ''}`}
                    onClick={() => onOpenBlock(date, block.id)}
                    className="absolute inset-x-0.5 rounded-sm px-1.5 py-0.5 text-left text-xs/4 overflow-hidden flex flex-col gap-0.5 cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring"
                    style={{ top: start * ROW + 1, height: (end - start) * ROW - 1, backgroundColor: colors.background, color: colors.text }}
                  >
                    <span className="flex items-center gap-1 min-w-0 font-semibold">
                      {block.is_important && <span aria-hidden="true" className="shrink-0"><StarIcon /></span>}
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] opacity-90">
                      {block.start}–{block.end}
                      {todos.total > 0 && (
                        <span aria-hidden="true" className="rounded-full bg-card px-1 leading-4"><TodoCount done={todos.done} total={todos.total} aria-label={undefined} /></span>
                      )}
                    </span>
                  </button>
                );
              })}

              {/* 오늘 칸: 지금 시각 선 */}
              {date === today && (
                <div aria-hidden="true" data-testid="week-now" className="absolute inset-x-0 z-10 flex items-center pointer-events-none" style={{ top: nowTop }}>
                  <span className="size-2 -ml-1 rounded-full bg-destructive" />
                  <span className="h-0.5 flex-1 bg-destructive" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
