import { KR_HOLIDAYS } from '../../data/holidays';
import { DAY_NAMES } from '../../constants/calendar';
import { getDaysInMonth, getDayOfWeek } from '../../utils/date';
import { eventColors } from '../../utils/color';
import StarIcon from '../icons/StarIcon';
import { todoPillOf, todosOf } from '../../utils/todos';
import TodoPill from '../common/TodoPill';

// 칸 아래쪽 할 일 알약은 TodoPill 부품이 그린다 (주 보기 보드와 같은 모양)
// 칸 테두리: 달력 영역(보기 색 2단계)과 같은 색이라 보이지 않는다. 연 보기 파랑, 월 보기 앰버
const CELL_BORDER = { blue: 'border-surface-blue-2', amber: 'border-surface-amber-2' };


// 달력의 날짜 한 칸. 화면 맞춤 모드에서 없는 날(예: 2월 30일)은 아무것도 그리지 않는다.
// panelDate: 오른쪽 일정 패널에 열린 날짜. 그 칸에는 테두리를 둘러 지금 보고 있는 날임을 알린다.
export default function DayCell({
  year, month, day,
  isWrapMode,
  events, timeBlocks,
  selectionStart, selectionEnd,
  panelDate,
  today,
  theme = 'blue',
  onMouseDown, onMouseEnter,
  onOpenDay, onShowMore,
}) {
  const maxDays = getDaysInMonth(year, month);
  
  if (day > maxDays) {
    if (isWrapMode) return null;
    // 없는 날(예: 2월 30일) 자리: 칠하지 않고 파랑 3단계 점선 테두리만 둔다 (리디자인 기획서 "빈 칸 점선 = 3단계")
    return <div data-testid="empty-day" className="border border-dashed border-surface-blue-3 rounded-sm w-[120px] shrink-0"></div>;
  }

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayOfWeek = getDayOfWeek(year, month, day);
  const holidayName = KR_HOLIDAYS[year]?.[dateString];
  const isHoliday = holidayName || dayOfWeek === 0 || dayOfWeek === 6; // 공휴일·일요일(0)·토요일(6)은 쉬는 날
  
  const dayEvents = events.filter(e => e.start_date <= dateString && e.end_date >= dateString);
  const daySchedules = [...(timeBlocks[dateString] || [])].sort((a, b) => a.start.localeCompare(b.start));

  // 그날의 할 일: 그날에 걸친 기간·종일 일정과 그날 시간 카드의 할 일 (일정 패널의 할 일 구역과 같은 기준)
  const dayTodos = [...dayEvents.flatMap(todosOf), ...(timeBlocks[dateString] || []).flatMap(todosOf)];
  const pill = todoPillOf(dayTodos, dateString, today);

  // 칸 높이가 정해져 있어서, 할 일 알약이 있는 날은 일정을 2개까지만 보이고 나머지는 "+N 더보기"로 넘긴다
  const MAX_VISIBLE = pill ? 2 : 3;
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

  // 칸 바탕과 테두리. 캘린더 섹션이 파랑 2단계라, 칸 바탕을 2단계로 바꾸면 섹션에 묻혀 칸이 사라져 보인다. 그래서
  //   끌어서 고른 칸: 파랑 2단계 바탕 + 파랑(primary) 테두리
  //   그 밖의 칸: 쉬는 날은 연한 빨강, 나머지는 흰색. 테두리는 섹션과 같은 2단계라 보이지 않는다.
  //              마우스를 올리면 끌어서 고른 칸과 같은 모양(2단계 바탕 + 파랑 테두리)이 된다. (테두리만 진하게 하면 잘 안 보였다)
  // (3·4단계 바탕은 흐린 글자·휴일 글자가 잘 안 읽혀서 칸 바탕으로 쓰지 않는다)
  const cellLook = isSelected
    ? 'bg-selection border-primary'
    : `${isHoliday ? 'bg-holiday-surface' : 'bg-card'} ${CELL_BORDER[theme]} hover:bg-selection hover:border-primary`;

  return (
    <div 
      onMouseDown={() => onMouseDown(dateString)}
      onMouseEnter={() => onMouseEnter(dateString)}
      // 칸 아무 곳이나 누르면 오른쪽에 그날 일정 패널이 열린다. (두 칸 이상 끌면 드래그라서 여기까지 오지 않는다)
      onClick={(e) => onOpenDay(e, dateString)}
      aria-current={dateString === panelDate ? 'date' : undefined}
      data-date={dateString} // 상단 바 "오늘"이 이 칸을 찾아 스크롤할 때 쓴다
      // 칸마다 자기 테두리와 9px 모서리(rounded-sm)를 갖는다. 칸 사이 4px 틈은 MonthRow가 둔다.
      // 테두리 색은 위의 cellLook이 정한다. (두께 1px은 늘 그대로라 칸 크기는 같다)
      // 너비: 가로 스크롤은 120px 고정, 화면 맞춤은 MonthRow의 격자가 정한다(최소 120px, 남는 폭을 나눠 가짐).
      className={`group/cell p-1 border rounded-sm ${cellLook} ${isWrapMode ? 'min-w-0' : 'w-[120px] shrink-0'} h-28 flex flex-col gap-1 relative select-none cursor-pointer ${dateString === panelDate ? 'ring-2 ring-inset ring-primary' : ''}`}
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
        {/* 일정 막대: 일정 색을 연하게 한 바탕 + 같은 계열 짙은 글자 (utils/color.js의 eventColors). 모서리 5px */}
        {visibleEvents.map((evt) => {
          const colors = eventColors(evt.color);
          return (
          // 막대를 누르면 그날의 일정 패널과 오른쪽 기간 일정 상세 패널이 함께 열린다 (예전의 수정 팝업·연필·X 버튼 대신)
          <div
            key={evt.id}
            onClick={(e) => onOpenDay(e, dateString, null, evt.id)}
            style={{ backgroundColor: colors.background, color: colors.text }}
            className="group/evt text-xs/4 px-1.5 py-px rounded-[5px] flex items-center relative font-semibold w-full min-w-0 cursor-pointer hover:brightness-95"
          >
            <span className="truncate flex-1">{evt.title}</span>
          </div>
          );
        })}

        {visibleSchedules.map((sch) => (
          <div
            key={sch.id}
            onClick={(e) => onOpenDay(e, dateString, sch.id)}
            className="text-[11px]/4 text-foreground flex gap-1.5 items-center px-1 w-full min-w-0 rounded-sm hover:bg-accent"
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

      <TodoPill pill={pill} className="self-start" />
    </div>
  );
}
