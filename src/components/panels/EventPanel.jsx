import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import TodoList from './TodoList';
import { Button } from '@/components/ui/button';
import { daysBetween, formatShortDate } from '../../utils/date';
import { todosOf } from '../../utils/todos';

// 기간·종일 일정 하나의 상세 패널. 일정 패널 오른쪽에 열린다. (시간 일정의 BlockPanel과 같은 모양)
//   이름·기간·색·할 일을 고치면 바로 저장된다. 삭제 버튼은 부모(App)가 확인 팝업을 띄운다.
//   기간 일정은 이름이 꼭 있어야 해서, 이름을 다 지운 채 닫으면 패널을 열 때의 이름으로 되돌린다.
//   Esc 키로도 닫힌다.
//
//   event              고른 일정 { id, title, start_date, end_date, color, todos? }
//   onChange(changes)  예: onChange({ title: '워크숍' }), onChange({ start_date: '2026-01-05', end_date: '2026-01-07' })
//   onChangeTodos(change)  할 일 목록 고치기 ("지금 목록 → 새 목록" 함수, TodoList 참고)
export default function EventPanel({ event, onChange, onChangeTodos, onDelete, onClose }) {
  const titleRef = useRef(null);
  // 닫힐 때(어떤 방법으로 닫히든 이 부품이 사라질 때) 이름이 비어 있으면 처음 이름으로 되돌린다.
  const openedTitle = useRef(event.title);
  const latest = useRef({ title: event.title, onChange });
  useEffect(() => {
    latest.current = { title: event.title, onChange };
  });
  useEffect(() => {
    titleRef.current?.focus();
    const initialTitle = openedTitle.current;
    return () => {
      const { title, onChange: change } = latest.current;
      if (!title.trim()) change({ title: initialTitle });
    };
  }, []);

  const days = daysBetween(event.start_date, event.end_date) + 1;
  const rangeText = days === 1
    ? `${formatShortDate(event.start_date)} · 종일`
    : `${formatShortDate(event.start_date)}–${formatShortDate(event.end_date)} · ${days}일`;

  // 시작일이 종료일보다 뒤가 되면 종료일을 시작일로 따라오게 하고, 종료일을 시작일보다 앞으로 고르면 시작일을 따라오게 한다.
  // (날짜 칸을 비우면 무시한다)
  const changeStart = (value) => {
    if (!value) return;
    onChange({ start_date: value, end_date: value > event.end_date ? value : event.end_date });
  };
  const changeEnd = (value) => {
    if (!value) return;
    onChange({ end_date: value, start_date: value < event.start_date ? value : event.start_date });
  };

  return (
    <aside
      aria-label="기간 일정 상세"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      // 일정 패널·달력 상자와 같은 높이·모양의 카드. 너비 320px. 높이는 달력과 같은 줄을 꽉 채운다(h-full, 줄은 App이 정한다).
      className="w-[320px] shrink-0 h-full rounded-lg border border-border bg-card shadow-xs overflow-y-auto flex flex-col"
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground">기간 일정</h2>
          <p className="text-xs text-muted-foreground">{rangeText}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="기간 일정 상세 닫기" onClick={onClose}><X /></Button>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-title" className="text-sm font-semibold text-foreground">이름</label>
          <input
            id="event-title" ref={titleRef} type="text" placeholder="예: 여름 워크숍"
            value={event.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="px-3 py-1.5 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">기간</span>
          <div className="flex items-center gap-1.5 text-sm">
            <input
              type="date" aria-label="시작일" value={event.start_date}
              onChange={(e) => changeStart(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 border border-input rounded-sm bg-card"
            />
            <span className="text-muted-foreground">~</span>
            <input
              type="date" aria-label="종료일" value={event.end_date}
              onChange={(e) => changeEnd(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 border border-input rounded-sm bg-card"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">색</span>
          <ColorPicker size="md" label="기간 일정 색" value={event.color} onChange={(color) => onChange({ color })} />
        </div>

        <div className="border-t border-border pt-4">
          <TodoList todos={todosOf(event)} onChange={onChangeTodos} />
        </div>

        <p className="text-[11px] text-muted-foreground">입력하면 바로 저장돼요.</p>

        <Button variant="destructive" size="sm" className="self-start" onClick={onDelete}>이 기간 일정 삭제</Button>
      </div>
    </aside>
  );
}
