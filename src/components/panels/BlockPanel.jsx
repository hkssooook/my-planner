import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import TodoList from './TodoList';
import SelectBox from '../common/SelectBox';
import { Button } from '@/components/ui/button';
import { formatShortDate } from '../../utils/date';
import { blockSlotRange, freeGapAround, freeStartsFor, slotToTime } from '../../utils/timeBlocks';
import { todosOf } from '../../utils/todos';

const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i); // [from, to)

// 시간 일정 카드 하나의 상세 패널. 일정 패널 오른쪽에 열린다. (나중에 이 카드의 예산도 여기에 붙는다)
//   이름·시간·색·주요(★)·할 일을 고치면 "고치는 중인 것"에 담기고, 일정 패널의 [저장]을 눌러야 저장된다. 삭제 버튼으로 카드를 지운다.
//   이름도 할 일도 없이 닫으면 부모(App)가 그 카드를 지운다. (시간표를 실수로 눌러 생긴 카드를 남기지 않으려고)
//   Esc 키로도 닫힌다.
//
//   date      카드가 있는 날짜,  block  고른 카드
//   blocks    그날의 카드 목록 (시각 목록에서 다른 카드와 겹치는 시각을 빼려고)
//   onChange(changes)  예: onChange({ content: '팀 회의' }), onChange({ start: '09:30', end: '10:30' })
//   onChangeTodos(change)  할 일 목록 고치기 ("지금 목록 → 새 목록" 함수, TodoList 참고)
export default function BlockPanel({ date, block, blocks, onChange, onChangeTodos, onDelete, onClose }) {
  const nameRef = useRef(null);
  const [start, end] = blockSlotRange(block);
  const length = end - start;
  const [, hi] = freeGapAround(blocks, block.id);

  // 열리면(다른 카드를 고르면 부모가 key를 바꿔 새로 그린다) 이름 입력칸에 커서를 둔다. 끌어서 만들자마자 바로 이름을 쓸 수 있다.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <aside
      aria-label="시간 일정 상세"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      // 일정 패널·달력 상자와 같은 높이·모양의 카드. 너비 320px. 높이는 달력과 같은 줄을 꽉 채운다(h-full, 줄은 App이 정한다).
      className="w-[320px] shrink-0 h-full rounded-lg border border-border bg-card shadow-xs overflow-y-auto flex flex-col"
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground">시간 일정</h2>
          <p className="text-xs text-muted-foreground">{formatShortDate(date)} · {block.start}–{block.end}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="시간 일정 상세 닫기" onClick={onClose}><X /></Button>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="block-name" className="text-sm font-semibold text-foreground">이름</label>
          <input
            id="block-name" ref={nameRef} type="text" placeholder="예: 팀 회의"
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="px-3 py-1.5 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        {/* 시각 바꾸기 (시간표에서 카드를 끄는 것과 같은 일을 키보드로). 다른 카드와 겹치지 않는 시각만 목록에 나온다.
            시작 시각을 고르면 길이 그대로 카드가 옮겨지고(다른 카드를 넘어가도 됨), 끝 시각을 고르면 길이가 바뀐다 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">시간</span>
          <div className="flex items-center gap-1.5 text-sm">
            <SelectBox
              aria-label="카드 시작 시각" value={start}
              onChange={(e) => {
                const newStart = Number(e.target.value);
                onChange({ start: slotToTime(newStart), end: slotToTime(newStart + length) });
              }}
            >
              {freeStartsFor(blocks, block.id).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
            </SelectBox>
            <span className="text-muted-foreground">~</span>
            <SelectBox
              aria-label="카드 끝 시각" value={end}
              onChange={(e) => onChange({ end: slotToTime(Number(e.target.value)) })}
            >
              {range(start + 1, hi + 1).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
            </SelectBox>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">색</span>
          <ColorPicker size="md" label="시간 일정 색" value={block.color} onChange={(color) => onChange({ color })} />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
          <input
            type="checkbox" checked={!!block.is_important}
            onChange={(e) => onChange({ is_important: e.target.checked })}
            className="w-4 h-4 rounded-sm border-input"
          />
          주요 일정 (달력에 ★ 표시)
        </label>

        <div className="border-t border-border pt-4">
          <TodoList todos={todosOf(block)} onChange={onChangeTodos} />
        </div>

        <p className="text-[11px] text-muted-foreground">고친 내용은 일정 패널의 [저장]을 눌러야 저장돼요. 이름도 할 일도 없이 닫으면 이 카드는 사라져요.</p>

        <Button variant="destructive" size="sm" className="self-start" onClick={onDelete}>이 시간 일정 삭제</Button>
      </div>
    </aside>
  );
}
