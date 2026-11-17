import TodoCount from '../common/TodoCount';
import { formatShortDate } from '../../utils/date';

// 상단 바 아래 요약 줄: 카드 세 장 (리디자인 기획서 ② 요약 줄). 숫자 계산은 utils/summary.js가 한다.
//   [올해 할 일 3 / 7]  [7일 이내 주요 일정 2 · 11/18 제주 여행]  [못 끝낸 일 4]
// 범위 이름(scope)만 보기에 따라 바뀐다: 연 보기는 "올해" (그 해가 올해가 아니면 "2027년").
// 세 카드 모두 같은 흰 카드다. (못 끝낸 일 카드에만 있던 왼쪽 노란 띠는 2026-11-17에 없앴다)
//
//   scope    '올해' 등 범위 이름
//   summary  summarize()의 결과 { todos, upcoming, overdue }
export default function SummaryRow({ scope, summary }) {
  const { todos, upcoming, overdue } = summary;
  const card = 'flex items-center gap-3 rounded-lg bg-card px-4 min-h-12 shadow-xs';
  const label = 'text-sm font-semibold text-muted-foreground whitespace-nowrap';
  return (
    <section aria-label="요약" className="grid grid-cols-3 gap-3 mb-3 shrink-0">
      <div className={card}>
        <span className={label}>{scope} 할 일</span>
        {todos.total > 0
          ? <TodoCount done={todos.done} total={todos.total} className="ml-auto text-lg" />
          : <span className="ml-auto text-sm text-muted-foreground">없음</span>}
      </div>

      <div className={card}>
        <span className={label}>7일 이내 주요 일정</span>
        <span className="text-lg font-bold text-foreground">{upcoming.count}</span>
        {upcoming.next && (
          <span className="ml-auto min-w-0 truncate rounded-sm bg-surface-blue-2 px-2 text-xs font-semibold leading-6 text-foreground">
            {formatShortDate(upcoming.next.date)} · {upcoming.next.title}
          </span>
        )}
      </div>

      <div className={card}>
        <span className={label}>못 끝낸 일</span>
        <span className={`text-lg font-bold ${overdue > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{overdue}</span>
      </div>
    </section>
  );
}
