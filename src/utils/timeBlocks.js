// 시간 일정(카드)을 다루는 도구 모음.
//
// 시간 일정은 날짜별로 "시작~끝 시각이 있는 카드" 목록으로 저장한다.
//   timeBlocks: { '2026-01-05': [{ id, start: '09:00', end: '10:00', content, color, is_important, todos? }] }
//   todos(할 일 목록)는 utils/todos.js가 다룬다.
// 시각은 'HH:MM' 글자로 저장한다. 글자 순서가 곧 시간 순서라서 그대로 정렬할 수 있다.
// 하루의 끝은 '24:00'으로 쓴다. (23시 일정 = '23:00'~'24:00')
//
// 예전에는 "몇 시 칸"(hour: 0~23)으로 저장했다. migrateDailyToBlocks가 옛 모양을 새 모양으로 바꿔 준다.
//
// 화면(일정 패널의 시간표)은 하루를 30분 칸 48개로 나눈다. 칸 번호 0 = 00:00~00:30, 19 = 09:30~10:00, 47 = 23:30~24:00.
// 카드끼리는 시간이 겹치지 않게 한다. (아래 isSlotTaken·freeRangeFrom·isRangeFree가 그 규칙을 지킨다)

const pad = (n) => String(n).padStart(2, '0');

// 9 → '09:00'
export const hourToTime = (hour) => `${pad(hour)}:00`;

// '09:30' → 9 (몇 시대에 속하는지)
export const timeToHour = (time) => Number(time.slice(0, 2));

// 카드마다 붙이는 고유번호. 나중에 투두·예산을 "어느 카드의 것인지" 이어 줄 때 쓴다.
export const makeBlockId = () => crypto.randomUUID();

const byStart = (a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);

// 옛 모양의 한 칸 → 새 모양의 카드. hour만 start/end로 바뀌고 나머지 내용은 그대로 둔다.
export function slotToBlock(slot, id = makeBlockId()) {
  const { hour, ...rest } = slot;
  return { ...rest, id, start: hourToTime(hour), end: hourToTime(hour + 1) };
}

const isValidSlot = (slot) =>
  slot && typeof slot === 'object' && Number.isInteger(slot.hour) && slot.hour >= 0 && slot.hour <= 23;

// 옛 저장 데이터 전체({ 날짜: [칸, …] })를 새 모양({ 날짜: [카드, …] })으로 바꾼다.
// 모양이 이상한 날짜나 칸은 건너뛰어서, 엉뚱한 데이터 때문에 앱이 멈추지 않게 한다.
export function migrateDailyToBlocks(daily) {
  const result = {};
  for (const [date, slots] of Object.entries(daily)) {
    if (!Array.isArray(slots)) continue;
    result[date] = slots.filter(isValidSlot).map((slot) => slotToBlock(slot)).sort(byStart);
  }
  return result;
}

// --- 30분 칸 시간표 -------------------------------------------------------------------------

export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = 48; // 24시간 × 30분 칸 2개

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// 19 → '09:30', 48 → '24:00' (하루의 끝)
export const slotToTime = (slot) => `${pad(Math.floor(slot / 2))}:${slot % 2 ? '30' : '00'}`;

// '09:30' → 19. 30분에 딱 맞지 않는 시각은 그 시각이 들어 있는 칸으로 내린다. ('09:45' → 19)
export const timeToSlot = (time) => Math.floor(toMinutes(time) / SLOT_MINUTES);

// 카드가 차지하는 칸 범위 [시작 칸, 끝 칸) — 끝 칸은 포함하지 않는다. 09:00~10:30 → [18, 21)
// 끝이 30분에 딱 맞지 않으면 그 칸까지 차지한 것으로 본다. 길이가 0이어도 최소 한 칸은 차지한다.
export function blockSlotRange(block) {
  const start = timeToSlot(block.start);
  const end = Math.ceil(toMinutes(block.end) / SLOT_MINUTES);
  return [start, Math.max(start + 1, end)];
}

// 그 칸에 이미 카드가 있는가?
export const isSlotTaken = (blocks, slot) =>
  blocks.some((block) => {
    const [start, end] = blockSlotRange(block);
    return slot >= start && slot < end;
  });

// [start, end) 칸이 모두 비어 있는가? (키보드로 시각을 골라 추가할 때 겹침 검사)
export function isRangeFree(blocks, start, end) {
  for (let slot = start; slot < end; slot += 1) {
    if (isSlotTaken(blocks, slot)) return false;
  }
  return true;
}

const SLOTS_PER_HOUR = 60 / SLOT_MINUTES; // 1시간 = 30분 칸 2개
const DEFAULT_START_SLOT = timeToSlot('09:00'); // 18

// 새 시간 일정의 처음 시각: 1시간짜리 빈자리 중 가장 이른 곳 [시작 칸, 끝 칸).
// 오늘이면(isToday) 지금 시(nowHour) 다음 정각부터, 다른 날이면 09:00부터 찾는다.
// 빈자리가 없으면 09:00~10:00을 준다 (저장할 때 겹친다고 알린다).
export function nextFreeHour(blocks, { isToday, nowHour }) {
  const from = isToday
    ? Math.min(SLOTS_PER_DAY - SLOTS_PER_HOUR, (nowHour + 1) * SLOTS_PER_HOUR)
    : DEFAULT_START_SLOT;
  for (let slot = from; slot + SLOTS_PER_HOUR <= SLOTS_PER_DAY; slot += 1) {
    if (isRangeFree(blocks, slot, slot + SLOTS_PER_HOUR)) return [slot, slot + SLOTS_PER_HOUR];
  }
  return [DEFAULT_START_SLOT, DEFAULT_START_SLOT + SLOTS_PER_HOUR];
}

// 드래그: 처음 누른 칸(anchor)에서 지금 마우스가 있는 칸(target) 쪽으로 늘리되,
// 이미 카드가 있는 칸을 만나면 그 바로 앞에서 멈춘다. 결과는 [시작 칸, 끝 칸).
// 위로 끌어도(target < anchor) 된다. anchor 칸은 비어 있다고 본다.
export function freeRangeFrom(blocks, anchor, target) {
  const step = target >= anchor ? 1 : -1;
  let last = anchor;
  for (let slot = anchor + step; step > 0 ? slot <= target : slot >= target; slot += step) {
    if (slot < 0 || slot >= SLOTS_PER_DAY || isSlotTaken(blocks, slot)) break;
    last = slot;
  }
  return step > 0 ? [anchor, last + 1] : [last, anchor + 1];
}

// --- 카드 옮기기·늘이기 ----------------------------------------------------------------------

// 카드(id)가 늘어날 수 있는 빈 구간 [lo, hi): 바로 위 이웃 카드의 끝 ~ 바로 아래 이웃 카드의 시작 (이웃이 없으면 0 / 48).
// 길이를 바꿀 때는 이 구간 안에서만 늘인다. 그래서 늘이면서 다른 카드를 덮지 않는다. (옮기기는 movedRange 참고)
export function freeGapAround(blocks, id) {
  const me = blocks.find((b) => b.id === id);
  const [start, end] = blockSlotRange(me);
  let lo = 0;
  let hi = SLOTS_PER_DAY;
  for (const block of blocks) {
    if (block.id === id) continue;
    const [s, e] = blockSlotRange(block);
    if (e <= start) lo = Math.max(lo, e);
    if (s >= end) hi = Math.min(hi, s);
  }
  return [lo, hi];
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// 카드(id)를 길이 그대로 [s, s+length) 자리에 놓을 수 있는가? (하루 안이고 다른 카드와 겹치지 않으면)
const fitsAt = (others, s, length) => s >= 0 && s + length <= SLOTS_PER_DAY && isRangeFree(others, s, s + length);

// 카드(id)를 길이 그대로 놓을 수 있는 모든 시작 칸 (카드 상세 패널의 시작 시각 목록)
export function freeStartsFor(blocks, id) {
  const others = blocks.filter((b) => b.id !== id);
  const [start, end] = blockSlotRange(blocks.find((b) => b.id === id));
  const length = end - start;
  return Array.from({ length: SLOTS_PER_DAY - length + 1 }, (_, s) => s).filter((s) => fitsAt(others, s, length));
}

// 카드(id)의 범위 [start, end)를 delta칸만큼 옮긴 결과. 길이는 그대로이고, 다른 카드를 넘어가도 된다.
// 옮긴 자리가 다른 카드와 겹치면, 겹치지 않는 가장 가까운 빈자리로 보낸다. (같은 거리면 끄는 방향 쪽 먼저)
// 하루 밖으로는 나가지 않는다. 놓을 곳이 전혀 없으면 원래 자리.
export function movedRange(blocks, id, [start, end], delta) {
  const others = blocks.filter((b) => b.id !== id);
  const length = end - start;
  const wanted = clamp(start + delta, 0, SLOTS_PER_DAY - length);
  if (fitsAt(others, wanted, length)) return [wanted, wanted + length];
  for (let distance = 1; distance <= SLOTS_PER_DAY; distance += 1) {
    const candidates = delta >= 0 ? [wanted + distance, wanted - distance] : [wanted - distance, wanted + distance];
    const found = candidates.find((s) => fitsAt(others, s, length));
    if (found !== undefined) return [found, found + length];
  }
  return [start, end];
}

// 범위의 한쪽 끝을 slot 칸까지 끌어 늘이거나 줄인 결과. 최소 30분(한 칸)이고 빈 구간 [lo, hi) 밖으로 나가지 않는다.
//   edge='start': 위쪽 끝을 slot 칸의 위로,  edge='end': 아래쪽 끝을 slot 칸의 아래로
export function resizedRange([start, end], edge, slot, [lo, hi]) {
  if (edge === 'start') return [clamp(slot, lo, end - 1), end];
  return [start, clamp(slot + 1, start + 1, hi)];
}

// [start, end) 칸을 차지하는 새 카드. 이름은 비워 두고, 카드 상세 패널에서 채운다.
export const makeTimeBlock = (start, end, color) => ({
  id: makeBlockId(), start: slotToTime(start), end: slotToTime(end), content: '', color, is_important: false,
});

// 카드 목록을 시작 시각 순서로 정렬한 새 목록
export const sortBlocks = (blocks) => [...blocks].sort(byStart);
