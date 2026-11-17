import { Plus } from 'lucide-react';
import StarIcon from '../icons/StarIcon';
import TodoCount from '../common/TodoCount';
import TodoPill from '../common/TodoPill';
import { KR_HOLIDAYS } from '../../data/holidays';
import { DAY_NAMES } from '../../constants/calendar';
import { addDays } from '../../utils/date';
import { eventColors } from '../../utils/color';
import { sortBlocks } from '../../utils/timeBlocks';
import { todoPillOf, todoProgress, todosOf } from '../../utils/todos';

// 주 보기 (보드형): 일요일부터 토요일까지 요일마다 한 칸. (2026-11-17 시간표형 대신 보드형으로 정함)
//   칸 머리: 요일·날짜(쉬는 날은 빨강, 오늘은 날짜에 파랑 동그라미) + 오른쪽 할 일 알약. 누르면 그날 일정 패널이 열린다.
//   그 아래: 기간·종일 일정 막대, 그다음 시간 일정 카드(시작 시각 순서). 누르면 그날 패널과 상세 패널이 열린다.
//   맨 아래: "+ 일정 더하기" → 그날 패널과 새 일정 패널(시간 일정, 다음 빈 1시간)
// 빈 시간이 없어 한 주의 일정이 스크롤 없이 거의 다 보인다. 시각을 끌어 바꾸는 일은 일정 패널의 [시간표]에서 한다.
// 칸은 달력 영역 높이를 채우고, 일정이 많으면 그 칸만 스크롤한다.
//
//   weekStart   그 주 일요일 'YYYY-MM-DD'
//   events, timeBlocks  저장된 일정 (달력과 같은 "저장된 것")
//   today, panelDate    오늘, 일정 패널에 열린 날 (열린 날 칸에 파랑 테두리)
//   onOpenDay(date, blockId?, eventId?)  그날 패널(과 상세 패널)을 연다
//   onAddEvent(date)    그날 새 일정 패널을 연다
export default function WeekView({ weekStart, events, timeBlocks, today, panelDate, onOpenDay, onAddEvent }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div data-testid="week-board" className="h-full grid grid-cols-7 gap-1 p-1">
      {days.map((date, i) => {
        const [year, , day] = date.split('-').map(Number);
        const holiday = KR_HOLIDAYS[year]?.[date];
        const isOff = Boolean(holiday) || i === 0 || i === 6;
        const isToday = date === today;
        const dayEvents = events.filter((evt) => evt.start_date <= date && evt.end_date >= date);
        const blocks = sortBlocks(timeBlocks[date] || []);
        const pill = todoPillOf([...dayEvents.flatMap(todosOf), ...blocks.flatMap(todosOf)], date, today);

        return (
          <section
            key={date}
            data-testid={`week-column-${date}`}
            aria-label={`${date} 일정`}
            className={`min-w-0 min-h-0 flex flex-col rounded-sm ${isOff ? 'bg-holiday-surface' : 'bg-card'} ${date === panelDate ? 'ring-2 ring-inset ring-primary' : ''}`}
          >
            {/* 칸 머리: 누르면 그날 일정 패널 */}
            <button
              type="button"
              onClick={() => onOpenDay(date)}
              aria-label={`${date} 상세 일정 관리`}
              className="shrink-0 flex items-center gap-1.5 px-2 pt-2 pb-1.5 text-left rounded-t-sm hover:bg-selection focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className={`text-xs font-semibold ${isOff ? 'text-holiday' : 'text-muted-foreground'}`}>{DAY_NAMES[i]}</span>
              <span
                className={isToday
                  ? 'inline-flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'
                  : `text-sm font-bold ${isOff ? 'text-holiday' : 'text-foreground'}`}
              >
                {day}
              </span>
              <TodoPill pill={pill} className="ml-auto" />
            </button>
            {holiday && <span className="px-2 -mt-1 mb-1 truncate text-[10px] text-holiday">{holiday}</span>}

            {/* 일정: 기간·종일 막대, 그다음 시간 카드 (시작 시각 순서). 많으면 이 칸만 스크롤 */}
            <ul aria-label={`${date} 일정 목록`} className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-1.5 pb-1">
              {dayEvents.map((evt) => {
                const colors = eventColors(evt.color);
                return (
                  <li key={evt.id}>
                    <button
                      type="button"
                      onClick={() => onOpenDay(date, null, evt.id)}
                      style={{ backgroundColor: colors.background, color: colors.text }}
                      className="w-full truncate rounded-[5px] px-1.5 py-0.5 text-left text-xs/4 font-semibold hover:brightness-95"
                    >
                      {evt.title}
                    </button>
                  </li>
                );
              })}
              {blocks.map((block) => {
                const colors = eventColors(block.color);
                const name = block.content.trim() || '제목 없음';
                const todos = todoProgress(todosOf(block));
                return (
                  <li key={block.id}>
                    <button
                      type="button"
                      aria-label={`${date} ${block.start}–${block.end} ${name}${block.is_important ? ' (주요)' : ''}`}
                      onClick={() => onOpenDay(date, block.id)}
                      style={{ backgroundColor: colors.background, color: colors.text }}
                      className="w-full rounded-sm px-1.5 py-1 text-left flex flex-col gap-0.5 hover:brightness-95"
                    >
                      <span className="flex items-center gap-1 min-w-0 text-xs font-semibold">
                        {block.is_important && <span aria-hidden="true" className="shrink-0"><StarIcon /></span>}
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[11px] opacity-90">
                        {block.start}–{block.end}
                        {todos.total > 0 && (
                          <span aria-hidden="true" className="ml-auto rounded-full bg-card px-1 leading-4"><TodoCount done={todos.done} total={todos.total} aria-label={undefined} /></span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* 그날 새 일정 */}
            <button
              type="button"
              onClick={() => onAddEvent(date)}
              aria-label={`${date} 일정 더하기`}
              className="shrink-0 m-1.5 mt-0 inline-flex items-center justify-center gap-1 rounded-sm border border-dashed border-surface-mint-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus aria-hidden="true" className="size-3.5" />일정 더하기
            </button>
          </section>
        );
      })}
    </div>
  );
}
