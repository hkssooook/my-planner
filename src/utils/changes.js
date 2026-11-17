// "저장된 것"과 "고치는 중인 것"이 몇 군데 다른지 센다. (저장 줄의 "저장 안 한 변경 n개")
//
// 일정 하나(기간·종일 일정 하나, 시간 카드 하나)를 한 군데로 센다.
// 새로 생긴 것, 지운 것, 무엇이든 고친 것(이름·시간·색·주요·할 일 등)이 모두 1개다.

// 두 값이 같은 내용인가 (속성 순서가 달라도 같은 것으로 본다)
const sameValue = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
const sortKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  }
  return value;
};

// id → 항목 지도 두 개를 비교해 다른 id의 개수를 센다
function countDiff(beforeMap, afterMap) {
  const ids = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  let count = 0;
  for (const id of ids) {
    if (!sameValue(beforeMap.get(id), afterMap.get(id))) count += 1;
  }
  return count;
}

// 기간·종일 일정 목록 [{ id, ... }] → id 지도
const eventMap = (events) => new Map(events.map((evt) => [String(evt.id), evt]));

// 날짜별 시간 카드 { '2026-01-05': [{ id, ... }] } → "날짜/id" 지도 (빈 날짜는 없는 것과 같다)
const blockMap = (timeBlocks) => new Map(
  Object.entries(timeBlocks).flatMap(([date, blocks]) => blocks.map((block) => [`${date}/${block.id}`, block])),
);

export function countChanges(saved, working) {
  return countDiff(eventMap(saved.events), eventMap(working.events))
    + countDiff(blockMap(saved.timeBlocks), blockMap(working.timeBlocks));
}
