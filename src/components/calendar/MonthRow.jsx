import DayCell from './DayCell';

// 한 달 한 줄: 월 이름 칸 + 날짜 칸 31개
// 칸들은 서로 4px(gap-1) 떨어져 있고 각자 9px 모서리(rounded-sm)를 갖는다.
// 층이 안쪽일수록 옅다: 캘린더 섹션(파랑 4단계) → 월 이름 칸(3단계) → 날짜 칸(1단계, 흰색)
export default function MonthRow({ year, month, isWrapMode, cellProps }) {
  const dayCells = Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
    <DayCell
      key={`${year}-${month}-${day}`}
      year={year} month={month} day={day}
      isWrapMode={isWrapMode}
      {...cellProps}
    />
  ));

  if (isWrapMode) {
    return (
      <div className="flex flex-wrap gap-1">
        <div className="w-full px-4 py-2 bg-surface-blue-3 rounded-sm text-left font-semibold text-foreground">
          {month}월
        </div>
        {dayCells}
      </div>
    );
  }

  return (
    <div className="flex gap-1 min-w-max">
      {/* 가로 스크롤해도 왼쪽에 고정되는 월 이름 칸.
          바깥 상자는 캘린더 섹션 바탕(파랑 4단계)과 같은 색이고 오른쪽에 4px을 더 가져서(pr-1), 바로 옆 틈으로 뒤에 지나가는 날짜 칸이 비쳐 보이지 않게 가린다.
          대신 -mr-1로 줄 사이 간격(gap-1)을 하나 빼서, 월 이름 칸과 첫 날짜 칸 사이도 다른 칸 사이처럼 4px로 보이게 한다. */}
      <div className="w-[calc(4rem+0.25rem)] -mr-1 pr-1 shrink-0 sticky left-0 z-10 bg-surface-blue-4">
        <div className="h-full rounded-sm bg-surface-blue-3 flex items-center justify-center font-semibold text-foreground">
          {month}월
        </div>
      </div>
      {dayCells}
    </div>
  );
}
