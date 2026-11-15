// 시간 일정(카드)을 다루는 도구 모음.
//
// 시간 일정은 날짜별로 "시작~끝 시각이 있는 카드" 목록으로 저장한다.
//   timeBlocks: { '2026-01-05': [{ id, start: '09:00', end: '10:00', content, color, is_important }] }
// 시각은 'HH:MM' 글자로 저장한다. 글자 순서가 곧 시간 순서라서 그대로 정렬할 수 있다.
// 하루의 끝은 '24:00'으로 쓴다. (23시 일정 = '23:00'~'24:00')
//
// 예전에는 "몇 시 칸"(hour: 0~23)으로 저장했다. 아래 도구들이 옛 모양과 새 모양을 서로 바꿔 준다.
// 상세 일정 창은 아직 24줄(한 시간 칸) 화면이라서, 저장하고 불러올 때 이 도구로 바꿔 쓴다.

const pad = (n) => String(n).padStart(2, '0');

// 9 → '09:00'
export const hourToTime = (hour) => `${pad(hour)}:00`;

// '09:30' → 9 (몇 시대에 속하는지)
export const timeToHour = (time) => Number(time.slice(0, 2));

// 카드마다 붙이는 고유번호. 나중에 투두·예산을 "어느 카드의 것인지" 이어 줄 때 쓴다.
export const makeBlockId = () => crypto.randomUUID();

// 정각에 시작해 한 시간 동안인 카드인가? (24줄 상세 일정 창에서 한 줄로 보여 줄 수 있는 카드)
export const isHourBlock = (block) =>
  block.start.endsWith(':00') && block.end === hourToTime(timeToHour(block.start) + 1);

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

// 그날의 카드 목록 → 상세 일정 창의 24줄. 카드가 없는 시간은 빈 줄로 채운다.
// 줄에 카드의 id를 함께 담아 두어, 저장할 때 같은 카드로 이어지게 한다.
export function blocksToSlots(blocks, defaultColor) {
  return Array.from({ length: 24 }, (_, hour) => {
    const found = blocks.find((b) => isHourBlock(b) && timeToHour(b.start) === hour);
    return found
      ? { hour, id: found.id, content: found.content, is_important: !!found.is_important, color: found.color || defaultColor }
      : { hour, content: '', is_important: false, color: defaultColor };
  });
}

// 상세 일정 창의 24줄 → 그날의 카드 목록.
// - 내용이 빈 줄은 저장하지 않는다.
// - 원래 있던 카드는 id와 (나중에 붙을) 다른 속성을 그대로 이어받는다.
// - 줄에 id가 미리 붙어 있으면 새 카드도 그 id를 쓴다. (자동 저장 때 글자를 칠 때마다 id가 바뀌지 않게)
// - 24줄 창으로 보여 줄 수 없던 카드(예: 9:30 시작)는 손대지 않고 남겨 둔다.
export function slotsToBlocks(slots, existingBlocks) {
  const untouched = existingBlocks.filter((b) => !isHourBlock(b));
  const fromSlots = slots
    .filter((slot) => slot.content.trim() !== '')
    .map(({ id, ...slot }) => {
      const old = existingBlocks.find((b) => b.id === id);
      return { ...old, ...slotToBlock(slot, id ?? makeBlockId()) };
    });
  return [...untouched, ...fromSlots].sort(byStart);
}
