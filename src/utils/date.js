// 연도를 동적으로 받아 일수와 요일을 계산하도록 수정
export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
export const getDayOfWeek = (year, month, day) => new Date(year, month - 1, day).getDay();

// 올해(연도 숫자)를 알려 준다. 예: 2026
export const getCurrentYear = () => new Date().getFullYear();

// 기준 연도 앞뒤로 연도 목록을 만든다. 예: getYearOptions(2026, { before: 1, after: 3 }) → [2025, 2026, 2027, 2028, 2029]
export const getYearOptions = (baseYear, { before, after }) =>
  Array.from({ length: before + after + 1 }, (_, i) => baseYear - before + i);
