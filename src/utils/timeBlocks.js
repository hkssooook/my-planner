// 시간 일정(카드)을 다루는 도구 모음.
//
// 시간 일정은 날짜별로 "시작~끝 시각이 있는 카드" 목록으로 저장한다.
//   timeBlocks: { '2026-01-05': [{ id, start: '09:00', end: '10:00', content, color, is_important }] }
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

// [start, end) 칸을 차지하는 새 카드. 이름은 비워 두고, 카드 상세 패널에서 채운다.
export const makeTimeBlock = (start, end, color) => ({
  id: makeBlockId(), start: slotToTime(start), end: slotToTime(end), content: '', color, is_important: false,
});

// 카드 목록을 시작 시각 순서로 정렬한 새 목록
export const sortBlocks = (blocks) => [...blocks].sort(byStart);
