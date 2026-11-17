import DayCell from './DayCell';
import { DAY_NAMES } from '../../constants/calendar';
import { getDayOfWeek, getDaysInMonth } from '../../utils/date';

// 월 보기: 한 달을 일요일부터 시작하는 7칸 × 주(5~6줄)로 보여 준다. (리디자인 기획서 ③ 달력 영역 "월 = 한 줄이 한 주")
// 날짜 칸은 연 보기와 같은 DayCell을 그대로 쓴다. 그래서 일정 막대·할 일 알약·쉬는 날·누르기·끌기가 모두 같다.
// 그달이 아닌 앞뒤 자리는 앰버 3단계 점선 빈칸이다. (리디자인 기획서 "빈 칸 점선 = 3단계")
//   year, month  보여 줄 해와 달 (1~12)
//   cellProps    날짜 칸에 넘길 값 묶음 (App의 cellProps)
export default function MonthView({ year, month, cellProps }) {
  const days = getDaysInMonth(year, month);
  const lead = getDayOfWeek(year, month, 1); // 1일의 요일 (0 = 일요일) = 앞 빈칸 수
  const total = Math.ceil((lead + days) / 7) * 7;
  const slots = Array.from({ length: total }, (_, i) => i - lead + 1); // 1 ~ days 밖이면 빈칸

  return (
    <div className="flex flex-col gap-1 p-1">
      {/* 요일 머리 줄: 일요일·토요일은 쉬는 날 색 */}
      <div aria-hidden="true" className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name, i) => (
          <div key={name} className={`py-1.5 text-center text-xs font-semibold ${i === 0 || i === 6 ? 'text-holiday' : 'text-foreground'}`}>{name}</div>
        ))}
      </div>
      <div data-testid="month-grid" className="grid grid-cols-7 gap-1">
        {slots.map((day, i) => (day >= 1 && day <= days
          ? <DayCell key={i} year={year} month={month} day={day} isWrapMode {...cellProps} />
          : <div key={i} data-testid="month-blank" className="h-28 rounded-sm border border-dashed border-surface-amber-3" />))}
      </div>
    </div>
  );
}
