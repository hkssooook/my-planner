import MonthRow from './MonthRow';

// 한 해 분량: 연도 구분선 + 1~12월 행
//   isFirst: 캘린더 섹션의 맨 위 해인가. 맨 위 구분선은 섹션 위쪽 끝에 붙고 위 모서리가 섹션과 같다(15px).
export default function YearSection({ year, isFirst = false, isWrapMode, cellProps }) {
  // 연도 구분선은 섹션 좌우 끝까지 붙는 띠다. (섹션에 좌우 안쪽 여백이 없어서 따로 늘릴 필요가 없다)
  // 맨 위 해는 위쪽 여백도 무시하고(-mt-1) 위 모서리를 섹션과 같게(rounded-t-lg), 중간 해는 모서리 없는 띠다.
  const edge = isFirst ? '-mt-1 rounded-t-lg' : '';
  return (
    <>
      {/* 연도 구분선 (Year Divider). 바탕은 캘린더 섹션과 같은 파랑 4단계라 섹션과 하나로 이어져 보이고, 연도 글자는 파랑 2단계다 */}
      <div className={`flex bg-surface-blue-4 ${edge} ${isWrapMode ? 'text-lg font-bold' : 'min-w-max'}`}>
        {/* 연도 글자는 아래 월 이름("1월")과 같은 줄에 선다. 월 이름 칸은 섹션 왼쪽 끝(0px)부터 64px이고 오른쪽에 4px 가림 띠가 붙어 있으므로,
            가로 스크롤은 너비 64+4px에 pr-1(앞 64px 안에서 가운데 맞춤), 화면 맞춤은 월 이름과 같은 왼쪽 여백 16px(pl-4, 왼쪽 맞춤) */}
        <div className={`${isWrapMode ? 'w-full pl-4 pr-4 py-3' : `w-[calc(4rem+0.25rem)] pr-1 shrink-0 py-3 sticky left-0 z-20 bg-surface-blue-4 ${isFirst ? 'rounded-tl-lg' : ''} flex items-center justify-center font-bold`} text-surface-blue-2`}>
          {year}
        </div>
        {/* 머리말의 연도 선택 칸이 이미 "○○년"을 보여 주므로, 여기에는 연도 숫자만 둔다 ("○○년 연간 일정" 글자는 중복이라 뺐다) */}
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
