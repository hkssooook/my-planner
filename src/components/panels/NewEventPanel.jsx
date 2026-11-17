import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import SelectBox from '../common/SelectBox';
import TodoList from './TodoList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COLOR_PALETTE } from '../../constants/colors';
import { daysBetween, formatShortDate } from '../../utils/date';
import { SLOTS_PER_DAY, isRangeFree, makeTimeBlock, slotToTime } from '../../utils/timeBlocks';

const range = (from, to) => Array.from({ length: to - from }, (_, i) => from + i); // [from, to)

// 새 일정을 만드는 두 번째 패널. 일정 패널 오른쪽에 열린다. (리디자인 기획서 "새 일정 패널")
//   - 맨 위 [시간 일정 | 종일 일정] 스위치로 종류를 고른다. 바꿔도 이름·색·할 일은 남고, "시간" 칸만 "날짜" 칸으로 바뀐다.
//   - 종일 일정에서 끝 날짜를 늦추면 기간 일정이 된다. (따로 "기간" 종류를 두지 않는다)
//   - 맨 아래 [취소] [저장]. 저장을 눌러야 일정이 생긴다. 이름은 꼭 있어야 하고, 시간 일정은 다른 카드와 겹치면 저장하지 않는다.
//   - Esc 키로도 취소된다.
//
//   draft   처음 값 { kind: 'timed' | 'allday', date, startDate, endDate, startSlot, endSlot }
//           date는 시간 일정이 들어갈 날(= 일정 패널의 날짜)
//   blocks  그날의 시간 카드 목록 (겹침 검사용)
//   onSave(result)  { kind: 'timed', block } 또는 { kind: 'allday', event }
//   onCancel()
export default function NewEventPanel({ draft, blocks, onSave, onCancel }) {
  const [kind, setKind] = useState(draft.kind);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0].value);
  const [important, setImportant] = useState(false);
  const [startDate, setStartDate] = useState(draft.startDate);
  const [endDate, setEndDate] = useState(draft.endDate);
  const [startSlot, setStartSlot] = useState(draft.startSlot);
  const [endSlot, setEndSlot] = useState(draft.endSlot);
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState('');
  const titleRef = useRef(null);

  // 열리면 이름 칸에 커서를 둔다 (끌어서 열자마자 바로 이름을 쓸 수 있게)
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const days = daysBetween(startDate, endDate) + 1;
  const summary = kind === 'timed'
    ? `${formatShortDate(draft.date)} · ${slotToTime(startSlot)}–${slotToTime(endSlot)}`
    : days === 1 ? `${formatShortDate(startDate)} · 종일` : `${formatShortDate(startDate)}–${formatShortDate(endDate)} · ${days}일`;

  // 날짜: 시작일이 종료일보다 뒤가 되면 종료일이 따라오고, 반대도 같다 (EventPanel과 같은 규칙)
  const changeStartDate = (value) => {
    if (!value) return;
    setStartDate(value);
    if (value > endDate) setEndDate(value);
  };
  const changeEndDate = (value) => {
    if (!value) return;
    setEndDate(value);
    if (value < startDate) setStartDate(value);
  };
  const changeStartSlot = (value) => {
    setStartSlot(value);
    if (endSlot <= value) setEndSlot(value + 1); // 끝은 늘 시작보다 뒤
    setError('');
  };

  const save = () => {
    const name = title.trim();
    if (!name) {
      setError('이름을 적어 주세요.');
      titleRef.current?.focus();
      return;
    }
    if (kind === 'timed') {
      if (!isRangeFree(blocks, startSlot, endSlot)) {
        setError('이미 있는 시간 일정과 겹쳐요. 다른 시각을 골라 주세요.');
        return;
      }
      onSave({ kind: 'timed', block: { ...makeTimeBlock(startSlot, endSlot, color), content: name, is_important: important, todos } });
    } else {
      onSave({ kind: 'allday', event: { title: name, start_date: startDate, end_date: endDate, color, todos } });
    }
  };

  return (
    <aside
      aria-label="새 일정"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      // 다른 상세 패널(카드·기간 일정)과 같은 높이·모양의 카드. 너비 320px, 오른쪽·아래 12px, 위 24px.
      className="w-[320px] shrink-0 self-start mt-6 mb-3 mr-3 h-[calc(100vh-36px)] rounded-lg border border-border bg-card shadow-xs overflow-hidden flex flex-col"
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground">새 일정</h2>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="새 일정 닫기" onClick={onCancel}><X /></Button>
      </header>

      <form
        className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 px-4 py-4"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        {/* 일정 종류: 시간 일정 / 종일 일정 */}
        <Tabs value={kind} onValueChange={(value) => { setKind(value); setError(''); }}>
          <TabsList aria-label="일정 종류" className="w-full bg-surface-blue-2">
            <TabsTrigger value="timed" className="flex-1">시간 일정</TabsTrigger>
            <TabsTrigger value="allday" className="flex-1">종일 일정</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-event-title" className="text-sm font-semibold text-foreground">이름</label>
          <input
            id="new-event-title" ref={titleRef} type="text" placeholder="일정 이름을 적어 주세요"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(''); }}
            className="px-3 py-1.5 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        {kind === 'timed' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">시간</span>
            <div className="flex items-center gap-1.5 text-sm">
              <SelectBox aria-label="새 일정 시작 시각" value={startSlot} onChange={(e) => changeStartSlot(Number(e.target.value))}>
                {range(0, SLOTS_PER_DAY).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
              </SelectBox>
              <span className="text-muted-foreground">~</span>
              <SelectBox aria-label="새 일정 끝 시각" value={endSlot} onChange={(e) => { setEndSlot(Number(e.target.value)); setError(''); }}>
                {range(startSlot + 1, SLOTS_PER_DAY + 1).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
              </SelectBox>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">날짜</span>
            <div className="flex items-center gap-1.5 text-sm">
              <input
                type="date" aria-label="새 일정 시작일" value={startDate}
                onChange={(e) => changeStartDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1 border border-input rounded-sm bg-card"
              />
              <span className="text-muted-foreground">~</span>
              <input
                type="date" aria-label="새 일정 종료일" value={endDate}
                onChange={(e) => changeEndDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1 border border-input rounded-sm bg-card"
              />
            </div>
            <p className="text-xs text-muted-foreground">여러 날이면 끝 날짜만 늦추면 돼요.</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">색</span>
          <ColorPicker size="md" label="새 일정 색" value={color} onChange={setColor} />
        </div>

        {kind === 'timed' && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox" checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="w-4 h-4 rounded-sm border-input"
            />
            주요 일정 (달력에 ★ 표시)
          </label>
        )}

        <div className="border-t border-border pt-4">
          <TodoList todos={todos} onChange={(change) => setTodos(change)} />
        </div>

        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {/* 폼 안의 저장 버튼(submit)이 있어야 이름 칸에서 Enter로도 저장된다. 보이는 저장 버튼은 아래 저장 줄에 있다 */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>

      {/* 저장 줄: 저장해야 일정이 생긴다 */}
      <div className="shrink-0 flex items-center gap-2 border-t border-border px-4 py-3">
        <span className="flex-1 text-xs text-muted-foreground">저장하면 달력에 생겨요</span>
        <Button variant="secondary" onClick={onCancel}>취소</Button>
        <Button onClick={save}>저장</Button>
      </div>
    </aside>
  );
}
