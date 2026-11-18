import { useState } from 'react';

import { YEAR_RANGE } from '../constants/calendar';
import { VIEW_THEME } from '../constants/themes';
import { addDays, getCurrentYear, getTodayString, getYearOptions, weekStartOf } from '../utils/date';

// 달력에서 "지금 어디를 보고 있나"를 기억하고 바꾸는 훅.
//   view          보기 'year'(연) | 'month'(월) | 'week'(주). 처음에는 연
//   currentYear   보는 해. 연 보기는 이 해와 다음 해를, 월 보기는 이 해의 currentMonth를 보여 준다
//   currentMonth  월 보기에서 보는 달 (1~12). 처음에는 이번 달
//   weekStart     주 보기에서 보는 주의 일요일 'YYYY-MM-DD'. 처음에는 이번 주
//   thisYear      앱을 연 해(올해). 한 번 읽어 고정한다. 연도 선택 칸의 목록(yearOptions)도 이 해를 기준으로 만든다
export default function useCalendarNav() {
  const [thisYear] = useState(getCurrentYear);
  const [currentYear, setCurrentYear] = useState(thisYear);
  const [view, setView] = useState('year');
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [weekStart, setWeekStart] = useState(() => weekStartOf(getTodayString()));

  const isMonthView = view === 'month';
  const isWeekView = view === 'week';

  // 보기를 바꾼다. 보는 해가 올해면 이번 달·이번 주를, 아니면 그 해 1월·첫 주를 보여 준다
  const changeView = (next) => {
    const isThisYear = currentYear === thisYear;
    if (next === 'month' && isThisYear) setCurrentMonth(new Date().getMonth() + 1);
    if (next === 'week') setWeekStart(weekStartOf(isThisYear ? getTodayString() : `${currentYear}-01-01`));
    setView(next);
  };

  // 상단 바의 연도 선택: 주 보기에서는 그 해의 첫 주로 간다
  const changeYear = (year) => {
    setCurrentYear(year);
    if (isWeekView) setWeekStart(weekStartOf(`${year}-01-01`));
  };

  // 월 보기의 ‹ ›·달 선택: 12월 다음은 다음 해 1월이라 해와 달을 함께 받는다
  const changeMonth = (year, month) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // 주를 옮긴다. 보는 해(요약 줄·연도 선택 기준)는 그 주의 가운데(수요일)가 속한 해로 맞춘다
  const changeWeek = (start) => {
    setWeekStart(start);
    setCurrentYear(Number(addDays(start, 3).slice(0, 4)));
  };

  // "오늘" 버튼: 올해·이번 달·이번 주로 돌아간다 (보기는 그대로)
  const jumpToToday = (today) => {
    setCurrentYear(thisYear);
    setCurrentMonth(Number(today.slice(5, 7)));
    setWeekStart(weekStartOf(today));
  };

  return {
    thisYear, yearOptions: getYearOptions(thisYear, YEAR_RANGE),
    view, isMonthView, isWeekView, theme: VIEW_THEME[view], // 보기 색: 연 = 파랑, 월 = 앰버, 주 = 민트
    currentYear, currentMonth, weekStart,
    changeView, changeYear, changeMonth, changeWeek, jumpToToday,
  };
}
