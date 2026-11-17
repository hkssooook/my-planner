import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 상단 바의 보기 탭 [● 연 | ● 월 | ● 주]. 점 색은 그 보기의 바탕 색(5단계)이다: 연 파랑 · 월 앰버 · 주 민트.
// (리디자인 기획서 "보기별 색": 탭의 색 점이 "파랑 = 연, 앰버 = 월, 민트 = 주" 약속을 알려 준다)
// 월·주 보기는 아직 만들지 않아서 "준비 중"으로 누를 수 없게 둔다.
//
//   view, onViewChange(view)  'year' | 'month' | 'week'
const VIEWS = [
  { value: 'year', label: '연', dot: 'bg-surface-blue-5', ready: true },
  { value: 'month', label: '월', dot: 'bg-surface-amber-5', ready: false },
  { value: 'week', label: '주', dot: 'bg-surface-mint-5', ready: false },
];

export default function ViewTabs({ view, onViewChange }) {
  return (
    <Tabs value={view} onValueChange={onViewChange}>
      <TabsList aria-label="보기" className="bg-card h-10 rounded-full p-1">
        {VIEWS.map((v) => (
          <TabsTrigger
            key={v.value} value={v.value} disabled={!v.ready}
            title={v.ready ? undefined : '준비 중'}
            className="rounded-full px-3.5 gap-1.5 data-active:bg-surface-blue-2"
          >
            <span aria-hidden="true" className={`size-2.5 rounded-full ${v.dot}`} />
            {v.label}
            {!v.ready && <span className="sr-only"> (준비 중)</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
