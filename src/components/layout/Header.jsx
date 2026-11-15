import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 화면 맨 위 머리말: 연도 선택 + 보기 방식(가로 스크롤 / 화면 맞춤) 버튼.
// 선택된 값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
export default function Header({ year, years, onYearChange, isWrapMode, onWrapModeChange }) {
  const yearItems = years.map((y) => ({ value: y, label: `${y}년` }));
  return (
    // 넓은 화면: 3칸 격자(빈 왼쪽 1fr | 가운데 제목+연도 | 오른쪽 1fr 보기 버튼). 양옆 칸 너비가 같아서 가운데 묶음이 정확히 한가운데에 온다.
    // 좁은 화면: 위에서 아래로 가운데 맞춰 쌓는다. 여백·간격은 shadcn 카드(Card) 기본값인 24px(p-6, gap-6)을 쓴다.
    <div className="mb-6 flex flex-col items-center gap-6 md:grid md:grid-cols-[1fr_auto_1fr] bg-card p-6 rounded-lg shadow-xs">
      {/* 가운데 묶음: 제목 밑에 연도 선택 */}
      <div className="flex flex-col items-center gap-3 md:col-start-2">
        <h1 className="text-xl text-muted-foreground hidden sm:block">연간 플래너</h1>
        {/* shadcn Select. items는 "값 → 화면에 보일 글자" 짝이라서, 닫혀 있을 때도 "2026년"처럼 글자가 보인다 */}
        <Select value={year} onValueChange={onYearChange} items={yearItems}>
          <SelectTrigger aria-label="연도 선택">
            <SelectValue />
          </SelectTrigger>
          {/* 머리말은 화면 맨 위라서, 선택된 항목을 트리거 자리에 맞추는 shadcn 기본 배치 대신 트리거 아래로 펼친다 (안 그러면 위쪽 선택지가 잘린다) */}
          <SelectContent alignItemWithTrigger={false} align="center">
            {yearItems.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 bg-muted p-1 rounded-md border border-border md:col-start-3 md:justify-self-end">
        <button 
          onClick={() => onWrapModeChange(false)} 
          aria-pressed={!isWrapMode}
          className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all ${!isWrapMode ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          가로 스크롤
        </button>
        <button 
          onClick={() => onWrapModeChange(true)} 
          aria-pressed={isWrapMode}
          className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all ${isWrapMode ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          화면 맞춤
        </button>
      </div>
    </div>
  );
}
