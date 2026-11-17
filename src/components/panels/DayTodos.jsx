import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TodoCount from '../common/TodoCount';
import { eventColors } from '../../utils/color';

const COMPACT_COUNT = 2; // 시간표 모드에서 처음 보여 줄 남은 할 일 개수

// 일정 패널의 "할 일" 구역: 그날의 시간 카드·기간 일정에 적힌 할 일을 한곳에 모아 보여 준다. (리디자인 기획서 ④ 공유 패널)
//   - 머리 줄: "할 일" + 오른쪽 끝 진행 숫자 "3 / 7"
//   - 남은 할 일만 먼저 보이고, 끝낸 일은 "끝낸 일 n개 보기"를 눌러야 보인다.
//   - 줄마다 체크박스 + 글자 + 어느 일정의 할 일인지 알려 주는 색 꼬리표(그 일정의 색)
//   - compact(시간표 모드): 남은 할 일을 앞의 2개만 보이고, 목록 아래 "남은 할 일 n개 더보기"로 펼친다 (시간표가 좁아지지 않게)
// 할 일을 새로 적거나 고치는 일은 카드·기간 일정 상세 패널에서 한다. 여기서는 모아 보고 체크만 한다.
//
//   items              [{ key, todo: { id, text, done }, sourceName, color }]  (그날 일정 순서대로)
//   compact            시간표 모드인가
//   onToggle(item, done)  체크를 바꿨을 때
export default function DayTodos({ items, compact = false, onToggle }) {
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const left = items.filter((item) => !item.todo.done);
  const done = items.filter((item) => item.todo.done);
  const visibleLeft = compact && !expanded ? left.slice(0, COMPACT_COUNT) : left;
  const hiddenCount = left.length - visibleLeft.length;

  const row = (item) => {
    const colors = eventColors(item.color);
    return (
      <li key={item.key}>
        <label className="flex items-center gap-2.5 min-h-10 px-3 rounded-md bg-surface-blue-1 border border-border cursor-pointer hover:bg-muted">
          <input
            type="checkbox" checked={item.todo.done}
            onChange={(e) => onToggle(item, e.target.checked)}
            className="size-4 shrink-0 accent-primary"
          />
          <span className={`flex-1 min-w-0 text-sm break-words ${item.todo.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.todo.text}
          </span>
          {/* 어느 일정의 할 일인지: 그 일정 색의 작은 꼬리표 */}
          <span
            className="shrink-0 max-w-[120px] truncate rounded-sm px-1.5 text-[11px] font-semibold leading-[18px]"
            style={{ backgroundColor: colors.background, color: colors.text }}
          >
            {item.sourceName}
          </span>
        </label>
      </li>
    );
  };

  return (
    <section aria-labelledby="day-panel-todos" className="shrink-0 border-t border-border pt-4 flex flex-col gap-2">
      <h3 id="day-panel-todos" className="flex items-baseline text-sm font-semibold text-foreground">
        할 일
        {items.length > 0 && <TodoCount done={done.length} total={items.length} className="ml-auto text-sm" />}
      </h3>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">시간 일정이나 기간 일정에 할 일을 적으면 여기에 모여요.</p>
      )}

      {visibleLeft.length > 0 && <ul aria-label="남은 할 일" className="flex flex-col gap-1.5">{visibleLeft.map(row)}</ul>}
      {left.length === 0 && items.length > 0 && <p className="text-xs text-muted-foreground">오늘 할 일을 모두 끝냈어요.</p>}

      {/* 시간표 모드: 나머지는 목록 아래 "더보기"로 */}
      {hiddenCount > 0 && (
        <button
          type="button" aria-expanded={false} onClick={() => setExpanded(true)}
          className="min-h-9 rounded-md bg-surface-blue-2 hover:bg-surface-blue-3 text-sm font-semibold text-foreground inline-flex items-center justify-center gap-1"
        >
          남은 할 일 {hiddenCount}개 더보기 <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      )}

      {done.length > 0 && (
        <>
          <button
            type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}
            className="self-start inline-flex items-center gap-1 px-0.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {showDone ? '끝낸 일 접기' : `끝낸 일 ${done.length}개 보기`}
            <ChevronDown aria-hidden="true" className={`size-3.5 transition-transform ${showDone ? 'rotate-180' : ''}`} />
          </button>
          {showDone && <ul aria-label="끝낸 일" className="flex flex-col gap-1.5">{done.map(row)}</ul>}
        </>
      )}
    </section>
  );
}
