import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 화면 맨 위 머리말: "무엇을 볼지" 고르는 곳. 크게 보이는 연도(누르면 연도 목록) 밑에 앱 이름을 부제목으로 둔다.
// (달력 보기 방식 버튼은 달력의 설정이라 달력 상자 위 ViewModeToggle로 옮겼다)
// 선택된 값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
export default function Header({ year, years, onYearChange }) {
  const yearItems = years.map((y) => ({ value: y, label: `${y}년` }));
  return (
    // 스크롤해도 화면 맨 위에 고정(sticky top-0). 카드만 고정하면 카드 위 빈틈·둥근 모서리 사이로 달력이 비쳐 보이므로,
    // 화면 배경색 띠로 감싸 그 자리를 가린다. 띠는 바깥 여백(24px)만큼 넓혀(-mx-6 -mt-6) 화면 끝까지 덮는다.
    // 겹침 순서: 달력의 고정 칸(z-10·z-20)보다 위, 팝업(z-50)보다 아래인 z-30.
    // 카드 안쪽 여백은 shadcn 카드(Card) 기본값인 24px(p-6)을 쓴다.
    <div className="sticky top-0 z-30 -mx-6 -mt-6 px-6 pt-6 pb-6 bg-background">
      <div className="flex flex-col items-center gap-1 bg-card p-6 rounded-lg shadow-xs">
        {/* shadcn Select. items는 "값 → 화면에 보일 글자" 짝이라서, 닫혀 있을 때도 "2026년"처럼 글자가 보인다 */}
        <Select value={year} onValueChange={onYearChange} items={yearItems}>
          {/* 입력칸 상자가 아니라 제목처럼 보이게: 테두리 없이 24px 반굵게. 마우스를 올리면 옅은 바탕이 생겨 누를 수 있음을 알린다.
              왼쪽 여백(34px) = 오른쪽 여백 12px + ⌄ 16px + 사이 간격 6px. 그래야 ⌄를 뺀 "2026년" 글자 자체가 정중앙에 온다 */}
          <SelectTrigger
            aria-label="연도 선택"
            className="h-auto data-[size=default]:h-auto border-transparent pl-[34px] pr-3 py-1 text-2xl font-semibold text-foreground hover:bg-accent"
          >
            <SelectValue />
          </SelectTrigger>
          {/* 머리말은 화면 맨 위라서, 선택된 항목을 트리거 자리에 맞추는 shadcn 기본 배치 대신 트리거 아래로 펼친다 (안 그러면 위쪽 선택지가 잘린다) */}
          <SelectContent alignItemWithTrigger={false} align="center">
            {yearItems.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <h1 className="text-sm text-muted-foreground hidden sm:block">연간 플래너</h1>
      </div>
    </div>
  );
}
