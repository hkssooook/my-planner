// 연도를 동적으로 받아 일수와 요일을 계산하도록 수정
export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
export const getDayOfWeek = (year, month, day) => new Date(year, month - 1, day).getDay();
