import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import { Button } from '@/components/ui/button';
import { formatShortDate } from '../../utils/date';
import { blockSlotRange, freeGapAround, freeStartsFor, slotToTime } from '../../utils/timeBlocks';

const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i); // [from, to)

// 시간 일정 카드 하나의 상세 패널. 일정 패널 오른쪽에 열린다. (나중에 이 카드의 투두·예산도 여기에 붙는다)
//   이름·색·주요(★)를 고치면 바로 저장된다. 삭제 버튼으로 카드를 지운다.
//   이름 없이 닫으면 부모(App)가 그 카드를 지운다. (시간표를 실수로 눌러 생긴 카드를 남기지 않으려고)
//   Esc 키로도 닫힌다.
//
//   date      카드가 있는 날짜,  block  고른 카드
//   blocks    그날의 카드 목록 (시각 목록에서 다른 카드와 겹치는 시각을 빼려고)
//   onChange(changes)  예: onChange({ content: '팀 회의' }), onChange({ start: '09:30', end: '10:30' })
export default function BlockPanel({ date, block, blocks, onChange, onDelete, onClose }) {
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
      // 일정 패널과 같은 높이·모양의 카드. 너비 320px, 오른쪽·아래 12px, 위 24px.
      className="w-[320px] shrink-0 self-start mt-6 mb-3 mr-3 h-[calc(100vh-36px)] rounded-lg border border-border bg-card shadow-xs overflow-y-auto flex flex-col"
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
            <select
              aria-label="카드 시작 시각" value={start}
              onChange={(e) => {
                const newStart = Number(e.target.value);
                onChange({ start: slotToTime(newStart), end: slotToTime(newStart + length) });
              }}
              className="px-2 py-1 border border-input rounded-sm bg-card"
            >
              {freeStartsFor(blocks, block.id).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
            </select>
            <span className="text-muted-foreground">~</span>
            <select
              aria-label="카드 끝 시각" value={end}
              onChange={(e) => onChange({ end: slotToTime(Number(e.target.value)) })}
              className="px-2 py-1 border border-input rounded-sm bg-card"
            >
              {range(start + 1, hi + 1).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
            </select>
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

        <p className="text-[11px] text-muted-foreground">입력하면 바로 저장돼요. 이름 없이 닫으면 이 카드는 사라져요.</p>

        <Button variant="destructive" size="sm" className="self-start" onClick={onDelete}>이 시간 일정 삭제</Button>
      </div>
    </aside>
  );
}
