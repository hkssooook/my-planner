import { KR_HOLIDAYS } from '../../data/holidays';
import { DAY_NAMES } from '../../constants/calendar';
import { getDaysInMonth, getDayOfWeek } from '../../utils/date';
import { readableTextOn } from '../../utils/color';
import EditIcon from '../icons/EditIcon';
import DeleteIcon from '../icons/DeleteIcon';
import PlusIcon from '../icons/PlusIcon';

// 달력의 날짜 한 칸. 화면 맞춤 모드에서 없는 날(예: 2월 30일)은 아무것도 그리지 않는다.
export default function DayCell({
  year, month, day,
  isWrapMode,
  events, dailySchedules,
  selectionStart, selectionEnd,
  onMouseDown, onMouseEnter,
  onAddDaily, onEditEvent, onDeleteEvent, onShowMore,
}) {
  const maxDays = getDaysInMonth(year, month);
  
  if (day > maxDays) {
    if (isWrapMode) return null;
    return <div className="bg-muted border-r border-b border-border w-[120px] shrink-0"></div>;
  }

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayOfWeek = getDayOfWeek(year, month, day);
  const holidayName = KR_HOLIDAYS[year]?.[dateString];
  const isHoliday = holidayName || dayOfWeek === 0;
  
  const dayEvents = events.filter(e => e.start_date <= dateString && e.end_date >= dateString);
  const daySchedules = dailySchedules[dateString] || [];
  const importantSchedules = daySchedules.filter(s => s.is_important).sort((a, b) => a.hour - b.hour);

  const MAX_VISIBLE = 3;
  const totalItems = dayEvents.length + importantSchedules.length;
  
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
  const remainingSlots = Math.max(0, MAX_VISIBLE - visibleEvents.length);
  const visibleSchedules = importantSchedules.slice(0, remainingSlots);
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
      className={`group/cell p-1 border-r border-b border-border w-[120px] shrink-0 h-28 flex flex-col gap-1 relative select-none ${isSelected ? 'bg-selection' : 'hover:bg-muted'}`}
    >
      <div className="flex justify-between items-start text-xs min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <span className={`font-medium ${isHoliday ? 'text-holiday' : 'text-foreground'}`}>
            {day} <span className="text-muted-foreground font-normal">({DAY_NAMES[dayOfWeek]})</span>
          </span>
          <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={(e) => onAddDaily(e, dateString)}
            className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-accent p-0.5 rounded-sm"
            title="개별 일정 등록"
          >
            <PlusIcon />
          </button>
        </div>
        {holidayName && (
          <span className="text-[10px]/4 text-holiday truncate text-right flex-1 ml-1">{holidayName}</span>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0">
        {visibleEvents.map((evt) => (
          <div 
            key={evt.id} 
            style={{ backgroundColor: evt.color, color: readableTextOn(evt.color) }} 
            className="group/evt text-[10px] px-1.5 py-0.5 mb-0.5 rounded-sm flex justify-between items-center shadow-xs relative font-medium w-full min-w-0"
          >
            <span className="truncate flex-1 pr-1">{evt.title}</span>
            <div className="hidden group-hover/evt:flex gap-1.5 bg-inherit pl-1 absolute right-1 inset-y-0 items-center">
              <button onClick={(e) => onEditEvent(e, evt)} className="opacity-80 hover:opacity-100"><EditIcon /></button>
              <button onClick={(e) => onDeleteEvent(e, evt)} className="opacity-60 hover:opacity-100"><DeleteIcon /></button>
            </div>
          </div>
        ))}

        {visibleSchedules.map((sch, idx) => (
          <div key={idx} className="text-[9.5px] text-foreground flex gap-1.5 items-center px-1 w-full min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sch.color }}></span>
            <span className="font-semibold text-muted-foreground shrink-0">{String(sch.hour).padStart(2, '0')}:00</span>
            <span className="truncate flex-1">{sch.content}</span>
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
