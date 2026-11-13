// 화면 맨 위 머리말: 연도 선택 + 보기 방식(가로 스크롤 / 화면 맞춤) 버튼.
// 선택된 값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
export default function Header({ year, years, onYearChange, isWrapMode, onWrapModeChange }) {
  return (
    <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-xs gap-4 md:gap-0">
      <div className="flex items-center gap-4">
        {/* 크기는 shadcn Select의 기본값(높이 36px, 글자 14px). 진짜 shadcn Select는 shadcn 도입 단계에서 교체한다 */}
        <select 
          value={year} 
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="h-9 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-400 cursor-pointer"
        >
          {years.map(y => (
            <option key={y} value={y}>{`${y}년 기준`}</option>
          ))}
        </select>
        <h1 className="text-xl text-gray-600 hidden sm:block">연속 연간 플래너</h1>
      </div>

      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md border border-gray-200">
        <button 
          onClick={() => onWrapModeChange(false)} 
          className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all ${!isWrapMode ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          가로 스크롤
        </button>
        <button 
          onClick={() => onWrapModeChange(true)} 
          className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all ${isWrapMode ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          화면 맞춤
        </button>
      </div>
    </div>
  );
}
