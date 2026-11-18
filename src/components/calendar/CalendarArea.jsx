import { CALENDAR_BACKGROUND } from '../../constants/themes';
import { getTodayString } from '../../utils/date';
import MonthView from './MonthView';
import WeekView from './WeekView';
import YearSection from './YearSection';

// 달력 영역: 보기에 따라 연(이 해 + 다음 해) · 월(한 달) · 주(일주일 보드)를 그린다.
// 달력은 "저장된 것"을 보여 준다 (저장해야 달력에 반영된다).
//   nav          useCalendarNav()가 돌려준 값 (보기, 보는 해·달·주, 보기 색)
//   isWrapMode   연 보기의 화면 맞춤 여부 (아니면 가로 스크롤)
//   events, timeBlocks  저장된 기간 일정·시간 카드
//   drag         usePanels().drag (날짜 칸을 끌어 고르기)
//   panelDate    일정 패널이 열린 날 (그 칸에 테두리). 없으면 null
//   onOpenDay(e, date, blockId?, eventId?)  칸·막대·카드를 눌렀을 때 (usePanels의 openDayPanel)
//   onAddEvent(date)  주 보기 칸의 "+ 일정 더하기"
//
// 달력 상자: 보기 색 2단계 바탕. 그 위에 날짜 칸이 흰색(1단계)으로 떠 보인다. (리디자인 기획서 "달력 영역 = 2단계")
// 남은 높이를 채우고(flex-1 min-h-0) 상자 안에서 스크롤한다. 그래서 스크롤해도 상자의 네 모서리(15px)가 늘 둥글게 보이고,
// 가로 스크롤 막대도 늘 상자 아래에 있다.
export default function CalendarArea({ nav, isWrapMode, events, timeBlocks, drag, panelDate, onOpenDay, onAddEvent }) {
  const { isMonthView, isWeekView, theme, currentYear, currentMonth, weekStart } = nav;
  const today = getTodayString();
  const box = `flex-1 min-h-0 rounded-lg shadow-xs ${CALENDAR_BACKGROUND[theme]}`;

  // 날짜 칸(DayCell)까지 전달할 값 묶음 (연·월 보기)
  const cellProps = {
    events, timeBlocks,
    selectionStart: drag.selectionStart, selectionEnd: drag.selectionEnd,
    onMouseDown: drag.handleMouseDown, onMouseEnter: drag.handleMouseEnter,
    panelDate,
    today, // 할 일 알약이 오늘·지난 날·앞으로의 날을 가른다
    theme, // 칸 테두리 색 (달력 영역과 같은 보기 색 2단계)
    onOpenDay,
    onShowMore: (dateString) => onOpenDay(null, dateString),
  };

  return (
    <main className="flex-1 min-w-0 flex flex-col">
      {isWeekView ? (
        // 주 보기(보드형): 요일마다 한 칸. 칸이 영역 높이를 채우고, 넘치면 그 칸만 스크롤한다
        <div data-testid="calendar-scroll" className={`${box} overflow-hidden`}>
          <WeekView
            weekStart={weekStart} events={events} timeBlocks={timeBlocks}
            today={today} panelDate={panelDate}
            onOpenDay={(date, blockId = null, eventId = null) => onOpenDay(null, date, blockId, eventId)}
            onAddEvent={onAddEvent}
          />
        </div>
      ) : isMonthView ? (
        // 월 보기: 한 달 (위아래로만 스크롤)
        <div data-testid="calendar-scroll" className={`${box} overflow-y-auto`}>
          <MonthView year={currentYear} month={currentMonth} cellProps={cellProps} />
        </div>
      ) : (
        // 연 보기: 이 해와 다음 해. 가로 스크롤은 위아래·좌우 모두(overflow-auto), 화면 맞춤은 위아래만
        <div
          data-testid="calendar-scroll"
          className={`${box} relative ${isWrapMode ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}`}
        >
          {/* 칸 사이에 4px 틈(gap-1)을 둬서 둥근 칸들이 떠 보이게 한다. 상자 안쪽 여백은 위 4px(pt-1, 첫 연도 띠가 -mt-1로 덮음)뿐이라 좌우·아래는 칸이 상자 끝에 붙는다 */}
          <div className={`flex flex-col gap-1 pt-1 ${isWrapMode ? '' : 'min-w-max'}`}>
            {[currentYear, currentYear + 1].map((year, i) => (
              <YearSection key={year} year={year} isFirst={i === 0} isWrapMode={isWrapMode} cellProps={cellProps} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
