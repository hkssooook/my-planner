import MonthRow from './MonthRow';

// 한 해 분량: 연도 구분선 + 1~12월 행
export default function YearSection({ year, isWrapMode, cellProps }) {
  return (
    <>
      {/* 연도 구분선 (Year Divider) */}
      <div className={`flex ${isWrapMode ? 'border-b-2 border-border bg-accent text-lg font-bold' : 'min-w-max border-b-2 border-border bg-accent'}`}>
        <div className={`${isWrapMode ? 'w-full px-4 py-3' : 'w-16 shrink-0 sticky left-0 z-20 bg-accent flex items-center justify-center font-bold text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'}`}>
          {year}
        </div>
        {!isWrapMode && (
          <div className="p-3 font-bold text-foreground sticky left-16 z-10">
            {year}년 연간 일정
          </div>
        )}
      </div>

      {/* 해당 연도의 1~12월 렌더링 */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
        <MonthRow
          key={`${year}-${month}`}
          year={year} month={month}
          isWrapMode={isWrapMode}
          cellProps={cellProps}
        />
      ))}
    </>
  );
}
