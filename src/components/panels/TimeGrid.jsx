import { useEffect, useRef, useState } from 'react';
import StarIcon from '../icons/StarIcon';
import TodoCount from '../common/TodoCount';
import { todoProgress, todosOf } from '../../utils/todos';
import { eventColors } from '../../utils/color';
import {
  SLOTS_PER_DAY, blockSlotRange, freeGapAround, freeRangeFrom, isSlotTaken, movedRange, resizedRange, slotToTime, timeToSlot,
} from '../../utils/timeBlocks';

// 30분 칸 한 줄의 높이(px). 30분 카드는 이 높이, 1시간 카드는 두 배다.
export const ROW = 24;
const FIRST_VISIBLE_SLOT = 16; // 처음 열면 08:00이 맨 위에 오게 스크롤한다
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, slot) => slot);

// [시작 칸, 끝 칸)을 차지하는 상자의 위치. 칸 줄(1px)은 칸 위쪽 끝(slot × ROW)에 그어진다.
// 상자는 시작 줄 바로 아래(+1)에서 시작해 끝 줄 바로 위까지 채운다(높이 − 1). 그래서 위·아래가 모두 시각 줄에 딱 붙는다.
const boxStyle = ([start, end]) => ({ top: start * ROW + 1, height: (end - start) * ROW - 1 });

// 일정 패널의 하루 시간표: 0~24시를 30분 칸 48개로 나눠 위에서 아래로 그린다.
//   - 빈 칸을 누르고 위아래로 끌었다 놓으면, 끈 만큼(30분 단위로 딱 맞춰) 새 카드가 생긴다. 누르기만 하면 30분 카드.
//   - 끄는 중에 이미 있는 카드에 닿으면 그 앞에서 멈춘다. (카드끼리 겹치지 않는다)
//   - 카드 가운데를 잡고 끌면 옮겨지고(길이 그대로), 맨 위·맨 아래 가장자리를 끌면 길이가 바뀐다. 모두 30분 단위.
//     옮길 때는 다른 카드를 넘어가도 되고, 다른 카드 위에 놓으면 겹치지 않는 가장 가까운 빈자리로 간다.
//     길이를 바꿀 때는 바로 위·아래 이웃 카드에 닿으면 멈춘다. (늘이면서 다른 카드를 덮지 않게)
//   - 카드를 누르기만 하면(키보드: Tab → Enter) 카드 상세 패널을 연다. 옮기거나 늘인 뒤에도 그 카드의 상세 패널이 열린다.
//
//   blocks            그날의 카드 목록
//   selectedBlockId   카드 상세 패널에 열린 카드 (테두리로 강조)
//   onCreate(start, end)  끌어서 고른 칸 범위 [시작 칸, 끝 칸)
//   onChangeTime(id, start, end)  카드를 옮기거나 늘인 결과 칸 범위
//   onSelect(id)      카드를 눌렀을 때
export default function TimeGrid({ blocks, selectedBlockId, onCreate, onChangeTime, onSelect }) {
  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  // 새 카드를 끄는 중인 범위 { anchor: 처음 누른 칸, target: 지금 마우스가 있는 칸 }. 끄는 중이 아니면 null. (미리보기 그리기용)
  const [drag, setDrag] = useState(null);
  // 옮기거나 늘이는 중인 카드의 임시 범위 { id, range: [시작 칸, 끝 칸) }. 놓기 전까지는 화면에만 보이고 저장하지 않는다.
  const [moving, setMoving] = useState(null);
  // 마우스를 놓을 때 쓰는 최신 값. 창 전체에 붙인 이벤트 함수는 붙인 때의 값을 기억하므로 ref로 넘긴다.
  const latest = useRef({ blocks, onCreate, onChangeTime, onSelect });
  useEffect(() => {
    latest.current = { blocks, onCreate, onChangeTime, onSelect };
  });
  // 끄는 중에 붙여 둔 창 이벤트를 떼는 함수. 끄는 도중 패널이 닫혀도 떼어지도록 기억해 둔다.
  const detachRef = useRef(null);
  useEffect(() => () => detachRef.current?.(), []);

  // 처음 열 때: 고른 카드가 있으면 그 카드가 조금 아래에 보이게, 없으면 08:00이 맨 위에 오게 스크롤한다.
  useEffect(() => {
    const selected = blocks.find((b) => b.id === selectedBlockId);
    const slot = selected ? Math.max(0, timeToSlot(selected.start) - 2) : FIRST_VISIBLE_SLOT;
    if (scrollRef.current) scrollRef.current.scrollTop = slot * ROW;
    // 패널을 처음 열 때 한 번만 맞춘다. (카드를 고를 때마다 시간표가 움직이면 어지럽다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면의 세로 위치(clientY) → 칸 번호 (0~47 밖으로 나가지 않게)
  const slotAt = (clientY) => {
    const top = gridRef.current.getBoundingClientRect().top;
    return Math.min(SLOTS_PER_DAY - 1, Math.max(0, Math.floor((clientY - top) / ROW)));
  };

  // 마우스를 누른 뒤 놓을 때까지 창 전체에서 마우스를 지켜본다. (시간표 밖으로 나가서 놓아도 끝나게)
  // 창 이벤트는 누르는 순간 바로 붙인다. 화면을 다시 그린 뒤에 붙이면, 아주 빨리 끌었다 놓을 때 "놓기"를 놓친다.
  //   onMove(slot)  마우스가 움직일 때 지금 칸 번호,  onUp(slot)  놓을 때 칸 번호
  const trackMouse = (onMove, onUp) => {
    const move = (ev) => onMove(slotAt(ev.clientY));
    const up = (ev) => {
      detach();
      onUp(typeof ev.clientY === 'number' ? slotAt(ev.clientY) : null);
    };
    const detach = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      detachRef.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    detachRef.current = detach;
  };

  // 빈 칸을 누르면 새 카드 끌기를 시작한다.
  const startDrag = (e) => {
    if (e.button !== 0) return;
    const anchor = slotAt(e.clientY);
    if (isSlotTaken(blocks, anchor)) return; // 카드가 있는 칸에서는 시작하지 않는다
    e.preventDefault(); // 끄는 동안 글자가 선택되지 않게

    let target = anchor;
    setDrag({ anchor, target });
    trackMouse(
      (slot) => { target = slot; setDrag({ anchor, target }); },
      (slot) => {
        if (slot !== null) target = slot;
        setDrag(null);
        const [start, end] = freeRangeFrom(latest.current.blocks, anchor, target);
        latest.current.onCreate(start, end);
      },
    );
  };

  // 카드를 누르면 옮기기(가운데) 또는 길이 바꾸기(data-edge가 붙은 위·아래 가장자리)를 시작한다.
  // 칸이 하나도 바뀌지 않고 놓으면 그냥 누른 것으로 보고, 카드 상세 패널만 연다.
  const startCardDrag = (e, block) => {
    e.stopPropagation(); // 시간표 바탕의 "새 카드 끌기"가 시작되지 않게
    if (e.button !== 0) return;
    e.preventDefault();
    const edge = e.target.closest('[data-edge]')?.dataset.edge ?? null; // 'start' | 'end' | null(옮기기)
    const original = blockSlotRange(block);
    const gap = freeGapAround(blocks, block.id);
    const anchor = slotAt(e.clientY);
    const rangeFor = (slot) =>
      (edge ? resizedRange(original, edge, slot, gap) : movedRange(blocks, block.id, original, slot - anchor));

    let range = original;
    trackMouse(
      (slot) => { range = rangeFor(slot); setMoving({ id: block.id, range }); },
      (slot) => {
        if (slot !== null) range = rangeFor(slot);
        setMoving(null);
        const { onChangeTime: change, onSelect: select } = latest.current;
        if (range[0] !== original[0] || range[1] !== original[1]) change(block.id, range[0], range[1]);
        select(block.id);
      },
    );
  };

  const preview = drag ? freeRangeFrom(blocks, drag.anchor, drag.target) : null;

  return (
    <div ref={scrollRef} data-testid="time-grid-scroll" className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4">
      {/* 위아래 8px 여백: 맨 위 "00:00"과 맨 아래 줄 글자가 잘리지 않게 */}
      <div className="flex py-2">
        {/* 왼쪽 시각 글자: 정각마다 그 줄 위쪽 선에 가운데를 맞춘다 */}
        <div aria-hidden="true" className="relative w-11 shrink-0" style={{ height: SLOTS_PER_DAY * ROW }}>
          {HOURS.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground"
              style={{ top: hour * 2 * ROW }}
            >
              {slotToTime(hour * 2)}
            </span>
          ))}
        </div>

        <div
          ref={gridRef}
          data-testid="time-grid"
          onMouseDown={startDrag}
          className="relative flex-1 min-w-0 select-none cursor-crosshair"
          style={{ height: SLOTS_PER_DAY * ROW }}
        >
          {/* 칸 줄: 정각은 실선, 30분은 옅은 점선 */}
          {SLOTS.map((slot) => (
            <div
              key={slot}
              aria-hidden="true"
              className={`absolute inset-x-0 border-t ${slot % 2 ? 'border-dashed border-border/70' : 'border-border'}`}
              style={{ top: slot * ROW }}
            />
          ))}
          <div aria-hidden="true" className="absolute inset-x-0 border-t border-border" style={{ top: SLOTS_PER_DAY * ROW }} />

          {/* 끄는 중인 범위 미리보기 */}
          {preview && (
            <div
              data-testid="time-grid-preview"
              className="absolute inset-x-1 rounded-sm border border-primary bg-primary/15 px-2 text-[11px] font-medium text-primary pointer-events-none"
              style={boxStyle(preview)}
            >
              {slotToTime(preview[0])}–{slotToTime(preview[1])}
            </div>
          )}

          {blocks.map((block) => {
            const isMoving = moving?.id === block.id;
            const [start, end] = isMoving ? moving.range : blockSlotRange(block);
            const selected = block.id === selectedBlockId;
            const name = block.content.trim() || '제목 없음';
            const colors = eventColors(block.color); // 연한 바탕 + 같은 계열 짙은 글자
            const todos = todoProgress(todosOf(block)); // 할 일 진행 상황 { done, total }
            return (
              <button
                key={block.id}
                type="button"
                aria-label={`${block.start}–${block.end} ${name}${block.is_important ? ' (주요)' : ''}${todos.total ? `, 할 일 ${todos.total}개 중 ${todos.done}개 완료` : ''}`}
                aria-pressed={selected}
                onMouseDown={(e) => startCardDrag(e, block)}
                onClick={() => onSelect(block.id)} // 키보드(Enter·Space)로 누를 때
                className={`group/card absolute left-1 right-1 rounded-sm px-2 py-0.5 text-left text-sm/[18px] overflow-hidden flex items-start gap-1.5 cursor-grab focus-visible:outline-2 focus-visible:outline-ring ${selected ? 'ring-2 ring-offset-1 ring-primary' : ''} ${isMoving ? 'opacity-90 shadow-md z-10 cursor-grabbing' : ''}`}
                style={{
                  ...boxStyle([start, end]),
                  backgroundColor: colors.background,
                  color: colors.text,
                }}
              >
                {/* 위·아래 가장자리 5px: 잡고 끌면 길이가 바뀐다 (마우스를 올리면 ↕ 모양) */}
                <span aria-hidden="true" data-edge="start" className="absolute inset-x-0 top-0 h-[5px] cursor-ns-resize" />
                <span aria-hidden="true" data-edge="end" className="absolute inset-x-0 bottom-0 h-[5px] cursor-ns-resize" />
                {block.is_important && <span className="shrink-0 mt-0.5"><StarIcon /></span>}
                <span className={`font-semibold truncate ${block.content.trim() ? '' : 'opacity-70'}`}>{name}</span>
                {/* 오른쪽 끝 묶음: [할 일 진행 표시] [시각] */}
                <span className="shrink-0 ml-auto flex items-start gap-1.5 text-xs/[18px] font-medium">
                  {/* 할 일 진행 숫자 (할 일이 있을 때만): 흰 알약 안에 "1 / 4". 카드 색 위에서도 늘 같은 모양으로 읽히게 흰 바탕에 둔다.
                      (화면 낭독기는 카드 이름에서 이미 "할 일 n개 중 m개 완료"를 읽으므로 여기서는 숨긴다)
                      달력 칸에는 일부러 넣지 않는다 (칸이 작아 복잡해 보여서) */}
                  {todos.total > 0 && (
                    <span aria-hidden="true" className="rounded-full bg-card px-1.5 leading-[16px] mt-px">
                      <TodoCount data-testid="todo-progress" done={todos.done} total={todos.total} aria-label={undefined} />
                    </span>
                  )}
                  {/* 끄는 중에는 바뀔 시각을 미리 보여 준다 */}
                  <span className="opacity-80">{slotToTime(start)}–{slotToTime(end)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
