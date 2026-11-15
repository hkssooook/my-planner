import { KR_HOLIDAYS } from '../../data/holidays';
import { DAY_NAMES } from '../../constants/calendar';
import { getDaysInMonth, getDayOfWeek } from '../../utils/date';
import { readableTextOn } from '../../utils/color';
import EditIcon from '../icons/EditIcon';
import DeleteIcon from '../icons/DeleteIcon';
import StarIcon from '../icons/StarIcon';
import { timeToHour } from '../../utils/timeBlocks';

// 달력의 날짜 한 칸. 화면 맞춤 모드에서 없는 날(예: 2월 30일)은 아무것도 그리지 않는다.
// panelDate: 오른쪽 일정 패널에 열린 날짜. 그 칸에는 테두리를 둘러 지금 보고 있는 날임을 알린다.
export default function DayCell({
  year, month, day,
  isWrapMode,
  events, timeBlocks,
  selectionStart, selectionEnd,
  panelDate,
  onMouseDown, onMouseEnter,
  onOpenDay, onEditEvent, onDeleteEvent, onShowMore,
}) {
  const maxDays = getDaysInMonth(year, month);
  
  if (day > maxDays) {
    if (isWrapMode) return null;
    return <div className="bg-muted border border-border rounded-sm w-[120px] shrink-0"></div>;
  }

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayOfWeek = getDayOfWeek(year, month, day);
  const holidayName = KR_HOLIDAYS[year]?.[dateString];
  const isHoliday = holidayName || dayOfWeek === 0;
  
  const dayEvents = events.filter(e => e.start_date <= dateString && e.end_date >= dateString);
  const daySchedules = [...(timeBlocks[dateString] || [])].sort((a, b) => a.start.localeCompare(b.start));

  const MAX_VISIBLE = 3;
  const totalItems = dayEvents.length + daySchedules.length;

  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
  const remainingSlots = Math.max(0, MAX_VISIBLE - visibleEvents.length);
  // 칸이 넘칠 때는 주요(★) 일정을 먼저 고르고, 고른 것은 다시 시간순으로 보여 준다.
  const visibleSchedules = [...daySchedules]
    .sort((a, b) => Number(b.is_important) - Number(a.is_important) || a.start.localeCompare(b.start))
    .slice(0, remainingSlots)
    .sort((a, b) => a.start.localeCompare(b.start));
  const hiddenCount = totalItems > MAX_VISIBLE ? totalItems - MAX_VISIBLE : 0;

  let isSelected = false;
  if (selectionStart && selectionEnd && selectionStart !== selectionEnd) {
    const sorted = [selectionStart, selectionEnd].sort();
    if (dateString >= sorted[0] && dateString <= sorted[1]) isSelected = true;
  }

  return (
    <div 
      onMouseDown={() => onMouseDown(dateString)}
      onMouseEnter={() => onMouseEnter(dateString)}
      // 칸 아무 곳이나 누르면 오른쪽에 그날 일정 패널이 열린다. (두 칸 이상 끌면 드래그라서 여기까지 오지 않는다)
      onClick={(e) => onOpenDay(e, dateString)}
      aria-current={dateString === panelDate ? 'date' : undefined}
      // 칸마다 자기 테두리와 9px 모서리(rounded-sm)를 갖는다. 칸 사이 4px 틈은 MonthRow가 둔다.
      className={`group/cell p-1 border border-border rounded-sm bg-card w-[120px] shrink-0 h-28 flex flex-col gap-1 relative select-none cursor-pointer ${isSelected ? 'bg-selection' : 'hover:bg-muted'} ${dateString === panelDate ? 'ring-2 ring-inset ring-primary' : ''}`}
    >
      <div className="flex justify-between items-start text-xs min-w-0">
        {/* 키보드·화면 낭독기용 입구. 누르면 클릭이 칸까지 올라가 위의 onClick이 일정 패널을 연다. */}
        <button
          type="button"
          title="상세 일정 관리"
          aria-label={`${dateString} 상세 일정 관리`}
          className={`shrink-0 font-medium rounded-sm px-0.5 -mx-0.5 hover:underline focus-visible:outline-2 focus-visible:outline-ring ${isHoliday ? 'text-holiday' : 'text-foreground'}`}
        >
          {day} <span className="text-muted-foreground font-normal">({DAY_NAMES[dayOfWeek]})</span>
        </button>
        {holidayName && (
          <span title={holidayName} className="text-[10px]/4 text-holiday truncate text-right flex-1 ml-1">{holidayName}</span>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0">
        {visibleEvents.map((evt) => (
          <div
            key={evt.id}
            onClick={(e) => onEditEvent(e, evt)}
            style={{ backgroundColor: evt.color, color: readableTextOn(evt.color) }}
            className="group/evt text-[10px] px-1.5 py-0.5 mb-0.5 rounded-sm flex justify-between items-center shadow-xs relative font-medium w-full min-w-0"
          >
            <span className="truncate flex-1 pr-1">{evt.title}</span>
            <div className="hidden group-hover/evt:flex gap-1.5 bg-inherit pl-1 absolute right-1 inset-y-0 items-center">
              <button onClick={(e) => onEditEvent(e, evt)} aria-label={`${evt.title} 수정`} className="opacity-80 hover:opacity-100"><EditIcon /></button>
              <button onClick={(e) => onDeleteEvent(e, evt)} aria-label={`${evt.title} 삭제`} className="opacity-60 hover:opacity-100"><DeleteIcon /></button>
            </div>
          </div>
        ))}

        {visibleSchedules.map((sch) => (
          <div
            key={sch.id}
            onClick={(e) => onOpenDay(e, dateString, timeToHour(sch.start))}
            className="text-[9.5px] text-foreground flex gap-1.5 items-center px-1 w-full min-w-0 rounded-sm hover:bg-accent"
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sch.color }}></span>
            <span className="font-semibold text-muted-foreground shrink-0">{sch.start}</span>
            <span className="truncate flex-1">{sch.content}</span>
            {sch.is_important && (
              <span className="text-warning shrink-0" title="주요 일정"><StarIcon /><span className="sr-only">주요</span></span>
            )}
          </div>
        ))}

        {hiddenCount > 0 && (
          <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={(e) => { e.stopPropagation(); onShowMore(dateString); }}
            className="text-[10px] text-muted-foreground font-medium pl-1 mb-0.5 text-left hover:text-foreground transition-colors w-full"
          >
            +{hiddenCount} 더보기
          </button>
        )}
      </div>
    </div>
  );
}
