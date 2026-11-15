// 연도를 동적으로 받아 일수와 요일을 계산하도록 수정
export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
export const getDayOfWeek = (year, month, day) => new Date(year, month - 1, day).getDay();

// 올해(연도 숫자)를 알려 준다. 예: 2026
export const getCurrentYear = () => new Date().getFullYear();

// 기준 연도 앞뒤로 연도 목록을 만든다. 예: getYearOptions(2026, { before: 1, after: 3 }) → [2025, 2026, 2027, 2028, 2029]
export const getYearOptions = (baseYear, { before, after }) =>
  Array.from({ length: before + after + 1 }, (_, i) => baseYear - before + i);

// --- 'YYYY-MM-DD' 날짜 글자 계산 ---
// 시간대·서머타임 영향을 받지 않도록 UTC(세계 표준시)로 계산한다.
const DAY_MS = 24 * 60 * 60 * 1000;
const toUtc = (dateString) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms) => new Date(ms).toISOString().slice(0, 10);

// 며칠 앞뒤의 날짜. 예: addDays('2026-01-31', 1) → '2026-02-01'
export const addDays = (dateString, days) => fromUtc(toUtc(dateString) + days * DAY_MS);

// 두 날짜 사이가 며칠인지. 예: daysBetween('2026-01-05', '2026-01-07') → 2
export const daysBetween = (from, to) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 예: '2026-01-05' → '2026년 1월 5일 (월)'
export const formatLongDate = (dateString) => {
  const [y, m, d] = dateString.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(toUtc(dateString)).getUTCDay()]})`;
};

// 예: '2026-01-05' → '1/5'
export const formatShortDate = (dateString) => {
  const [, m, d] = dateString.split('-').map(Number);
  return `${m}/${d}`;
};
