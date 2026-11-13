import DayCell from './DayCell';

// 한 달 한 줄: 월 이름 칸 + 날짜 칸 31개
export default function MonthRow({ year, month, isWrapMode, cellProps }) {
  return (
    <div className={`flex ${isWrapMode ? 'flex-wrap border-b border-gray-200 bg-white' : 'min-w-max'}`}>
      <div className={`${isWrapMode ? 'w-full px-4 py-2 bg-gray-50 border-b border-gray-200 text-left' : 'w-16 shrink-0 sticky left-0 z-10 border-r border-b border-gray-200 bg-gray-100 flex items-center justify-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'} font-semibold text-gray-700`}>
        {month}월
      </div>
      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
        <DayCell
          key={`${year}-${month}-${day}`}
          year={year} month={month} day={day}
          isWrapMode={isWrapMode}
          {...cellProps}
        />
      ))}
    </div>
  );
}
