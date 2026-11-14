// 대한민국 공휴일. 출처: 한국천문연구원 특일 정보 API (공공데이터포털).
// 직접 고치지 않는다. `npm run sync-holidays`로 holidays.generated.json을 새로 받아 오고, 설명은 docs/holiday-data.md에 있다.
//
// 내보내는 모양: { 2026: { '2026-01-01': '신정', ... }, 2027: { ... } }
// API에 아직 데이터가 없는 해(예: 아직 고시 전인 먼 미래)는 없는 것으로 보여서, 그 해의 달력에는 공휴일 이름이 나오지 않는다.
import generated from './holidays.generated.json';

// API가 주는 이름 중 우리 달력에서 다르게 보여 줄 것. (JSON 파일은 API 그대로 두고, 화면에 나갈 때만 바꾼다)
export const NAME_OVERRIDES = {
  '1월1일': '신정',
};

export const KR_HOLIDAYS = Object.fromEntries(
  Object.entries(generated).map(([year, days]) => [
    year,
    Object.fromEntries(Object.entries(days).map(([date, name]) => [date, NAME_OVERRIDES[name] ?? name])),
  ]),
);
