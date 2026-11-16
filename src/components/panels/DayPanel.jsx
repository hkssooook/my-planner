import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import ColorPicker from '../common/ColorPicker';
import { Button } from '@/components/ui/button';
import { COLOR_PALETTE } from '../../constants/colors';
import { eventColors } from '../../utils/color';
import { daysBetween, formatLongDate, formatShortDate } from '../../utils/date';
import { SLOTS_PER_DAY, isRangeFree, makeTimeBlock, slotToTime } from '../../utils/timeBlocks';
import TimeGrid from './TimeGrid';
import SelectBox from '../common/SelectBox';

const SLOT_OPTIONS = Array.from({ length: SLOTS_PER_DAY + 1 }, (_, slot) => slot); // 0(00:00) ~ 48(24:00)

// 기간 일정이면 "1/5–1/7 · 2/3일째", 하루짜리면 "종일"
function rangeLabel(evt, date) {
  if (evt.start_date === evt.end_date) return '종일';
  const total = daysBetween(evt.start_date, evt.end_date) + 1;
  const nth = daysBetween(evt.start_date, date) + 1;
  return `${formatShortDate(evt.start_date)}–${formatShortDate(evt.end_date)} · ${nth}/${total}일째`;
}

// 날짜를 누르면 화면 오른쪽에 열리는 그날의 일정 패널. 왼쪽 달력은 계속 보인다.
//   ① 머리말: 날짜, 전날/다음 날, 닫기
//   ② 이 날의 일정: 그날에 걸친 기간·종일 일정 목록 (누르면 오른쪽에 기간 일정 상세 패널)
//   ③ 종일 일정 추가: 이름 + 색
//   ④ 시간 일정: 0~24시 30분 칸 시간표. 빈 칸을 끌면 카드가 생기고, 카드를 누르면 오른쪽에 카드 상세 패널이 열린다.
// 날짜가 바뀌면 부모가 key를 바꿔 이 부품을 새로 그린다. (입력 중이던 상태가 다른 날짜로 넘어가지 않게)
//
//   dayEvents         그날에 걸친 기간·종일 일정 목록
//   blocks            그날의 시간 일정 카드 목록
//   selectedBlockId   카드 상세 패널에 열린 카드
//   onAddBlock(block) 새 카드 저장,  onChangeBlock(id, changes) 카드 시각 등 고치기,  onSelectBlock(id) 카드 고르기(상세 패널 열기)
export default function DayPanel({
  date, dayEvents, blocks, selectedBlockId = null,
  onClose, onMoveDay,
  onAddAllDay, selectedEventId = null, onSelectEvent,
  onAddBlock, onChangeBlock, onSelectBlock,
}) {
  const [allDayTitle, setAllDayTitle] = useState('');
  const [allDayColor, setAllDayColor] = useState(COLOR_PALETTE[0].value);
  // 키보드로 추가하기: 시작·끝 칸 번호 (처음에는 09:00~10:00)
  const [addStart, setAddStart] = useState(18);
  const [addEnd, setAddEnd] = useState(20);
  const [addError, setAddError] = useState('');

  const headingRef = useRef(null);

  // 열리면(또는 날짜가 바뀌면) 커서를 패널 제목으로 옮긴다. 키보드·화면 낭독기 사용자가 패널이 열린 것을 바로 알 수 있게 한다.
  // (카드를 눌러 열었으면 오른쪽 카드 상세 패널이 뒤이어 이름 입력칸으로 커서를 가져간다)
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // [start, end) 칸에 새 카드를 만들고 곧바로 골라서, 카드 상세 패널에서 이름을 쓰게 한다.
  const createBlock = (start, end) => {
    const block = makeTimeBlock(start, end, COLOR_PALETTE[0].value);
    onAddBlock(block);
    onSelectBlock(block.id);
  };

  const changeAddStart = (value) => {
    setAddStart(value);
    if (addEnd <= value) setAddEnd(value + 1); // 끝은 늘 시작보다 뒤
    setAddError('');
  };

  const addByKeyboard = () => {
    if (!isRangeFree(blocks, addStart, addEnd)) {
      setAddError('이미 있는 시간 일정과 겹쳐요. 다른 시각을 골라 주세요.');
      return;
    }
    setAddError('');
    createBlock(addStart, addEnd);
  };

  const addAllDay = () => {
    if (!allDayTitle.trim()) return;
    onAddAllDay({ title: allDayTitle.trim(), color: allDayColor });
    setAllDayTitle('');
  };

  return (
    <aside
      aria-label="상세 일정 관리"
      // 너비 460px. 위쪽은 왼쪽 연도 카드처럼 화면 가장자리에서 24px, 오른쪽은 왼쪽 여백과 같은 12px, 아래쪽은 12px 떨어진다 (아래를 24px 띄우면 패널이 짧아 보여서 절반으로).
      // 네 모서리 모두 둥글다(15px). 스크롤해도 그 자리에 머물고(sticky top-6), 높이는 화면 높이에서 위 24px + 아래 12px을 뺀 만큼이다.
      className="w-[460px] shrink-0 self-start sticky top-6 mt-6 mb-3 mr-3 h-[calc(100vh-36px)] rounded-lg border border-border bg-card shadow-xs overflow-y-auto flex flex-col"
    >
      {/* 머리말과 "이 날의 일정"은 패널을 스크롤해도 위에 붙어 있다 (그날 무슨 일이 있는지 늘 보이게).
          목록이 길어지면 고정 영역이 화면을 다 덮지 않도록 목록 높이를 200px(일정 5개 반쯤)로 제한하고 그 안에서만 스크롤한다. */}
      <div data-testid="day-panel-pinned" className="sticky top-0 z-10 bg-card border-b border-border">
        <header className="flex items-center gap-1 px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon-sm" aria-label="전날" onClick={() => onMoveDay(-1)}><ChevronLeft /></Button>
          <h2 ref={headingRef} tabIndex={-1} className="flex-1 text-center text-base font-semibold text-foreground focus:outline-hidden">
            {formatLongDate(date)}
          </h2>
          <Button variant="ghost" size="icon-sm" aria-label="다음 날" onClick={() => onMoveDay(1)}><ChevronRight /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="닫기" onClick={onClose} className="ml-1"><X /></Button>
        </header>

        <section aria-labelledby="day-panel-events" className="px-4 py-3">
          <h3 id="day-panel-events" className="text-sm font-semibold text-foreground mb-2">
            이 날의 일정 <span className="font-normal text-muted-foreground text-xs ml-1">{dayEvents.length}개</span>
          </h3>
          <ul className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
            {dayEvents.map((evt) => {
              const colors = eventColors(evt.color);
              return (
              <li key={evt.id}>
                {/* 띠 전체가 버튼: 누르면 오른쪽에 기간 일정 상세 패널이 열린다. 열린 일정은 테두리로 표시 */}
                <button
                  type="button"
                  aria-pressed={evt.id === selectedEventId}
                  onClick={() => onSelectEvent(evt.id)}
                  style={{ backgroundColor: colors.background, color: colors.text }}
                  className={`w-full text-left text-[13px] px-2.5 py-1.5 rounded-sm flex items-center gap-2 font-semibold min-w-0 cursor-pointer hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring ${evt.id === selectedEventId ? 'ring-2 ring-inset ring-primary' : ''}`}
                >
                  <span className="truncate flex-1">{evt.title}</span>
                  <span className="shrink-0 font-normal opacity-90">{rangeLabel(evt, date)}</span>
                </button>
              </li>
              );
            })}
          </ul>
          {dayEvents.length === 0 && (
            <p className="text-xs text-muted-foreground">이 날에 걸친 기간·종일 일정이 없어요.</p>
          )}
        </section>
      </div>

      {/* 패널의 남은 높이를 채운다(flex-1). min-h-0이 있어야 내용 길이만큼 늘어나지 않고 남은 높이에 맞춰져서,
          아래 시간표가 패널 바닥까지 차고 그 안에서 따로 스크롤된다. (화면이 아주 낮으면 시간 일정 칸 최소 320px을 지키고 패널 전체가 스크롤된다) */}
      <div className="flex-1 min-h-0 flex flex-col gap-6 px-4 py-4">
        <section aria-labelledby="day-panel-add" className="shrink-0">
          <h3 id="day-panel-add" className="text-sm font-semibold text-foreground mb-2">종일 일정 추가</h3>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => { e.preventDefault(); addAllDay(); }}
          >
            <div className="flex gap-2">
              <input
                type="text" placeholder="예: 워크숍 일정" aria-label="종일 일정명" value={allDayTitle}
                onChange={(e) => setAllDayTitle(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
              />
              {/* 바탕은 파랑 2단계 (secondary 토큰 = #E4E5FF) */}
              <Button type="submit" variant="secondary" size="sm">추가</Button>
            </div>
            <ColorPicker size="md" label="종일 일정 색" value={allDayColor} onChange={setAllDayColor} />
          </form>
        </section>

        {/* 시간 일정: 남은 높이를 모두 쓰고, 시간표는 그 안에서 따로 스크롤한다 (최소 320px) */}
        <section aria-labelledby="day-panel-times" className="border-t border-border pt-5 flex-1 min-h-[320px] flex flex-col">
          <div className="flex justify-between items-end mb-2">
            <h3 id="day-panel-times" className="text-sm font-semibold text-foreground">시간 일정</h3>
            <span className="text-[10px] text-muted-foreground">빈 칸을 끌어 만들기 · 카드를 끌어 옮기기 · 위아래 끝을 끌어 길이 바꾸기</span>
          </div>

          {/* 마우스 없이 만들기: 시작·끝 시각을 고르고 추가 */}
          <form
            aria-label="시간 일정 추가"
            className="flex items-center gap-1.5 mb-1 text-xs"
            onSubmit={(e) => { e.preventDefault(); addByKeyboard(); }}
          >
            <SelectBox
              aria-label="시작 시각" value={addStart}
              onChange={(e) => changeAddStart(Number(e.target.value))}
            >
              {SLOT_OPTIONS.slice(0, SLOTS_PER_DAY).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
            </SelectBox>
            <span className="text-muted-foreground">~</span>
            <SelectBox
              aria-label="끝 시각" value={addEnd}
              onChange={(e) => { setAddEnd(Number(e.target.value)); setAddError(''); }}
            >
              {SLOT_OPTIONS.slice(addStart + 1).map((slot) => <option key={slot} value={slot}>{slotToTime(slot)}</option>)}
            </SelectBox>
            <Button type="submit" variant="secondary" size="sm" className="ml-auto">추가</Button>
          </form>
          {addError && <p role="alert" className="text-xs text-destructive mb-1">{addError}</p>}

          <TimeGrid
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            onCreate={createBlock}
            onChangeTime={(id, start, end) => onChangeBlock(id, { start: slotToTime(start), end: slotToTime(end) })}
            onSelect={onSelectBlock}
          />
        </section>
      </div>
    </aside>
  );
}
