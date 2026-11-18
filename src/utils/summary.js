// 요약 줄(상단 바 아래 카드 세 장)에 보여 줄 숫자를 계산한다. (리디자인 기획서 ② 요약 줄)
// 화면과 상관없는 계산만 한다. 저장된 일정(달력에 보이는 것)을 넘겨받는다.
//
//   events      기간·종일 일정 [{ id, title, start_date, end_date, todos? }]
//   timeBlocks  날짜별 시간 카드 { 'YYYY-MM-DD': [{ id, start, content, is_important, todos? }] }
//   from, to    범위 'YYYY-MM-DD' (둘 다 포함). 예: 연 보기는 그 해 1월 1일 ~ 12월 31일
//   today       오늘 'YYYY-MM-DD'
//   now         지금 시각 'HH:MM' (오늘 이미 끝난 시간 일정을 빼려고). 안 주면 하루가 막 시작된 것으로 본다
//
// 돌려주는 값
//   todos     { done, total }  범위 안의 할 일 (범위에 걸친 기간·종일 일정 + 범위 안 날짜의 시간 카드)
//   upcoming  { count, next }  "7일 이내 주요 일정": 지금부터 7일(오늘 포함) 중 범위(from~to) 안에 들어가는 날의
//             ① 그 기간 안에 끝나는 기간·종일 일정 ② ★ 시간 일정. 이미 지난 것은 뺀다
//             (오늘 끝나는 기간·종일 일정은 오늘 하루 동안 센다. 오늘의 ★ 시간 일정은 끝나는 시각이 지나면 뺀다).
//             지난 해·달·주를 보거나, 7일보다 먼 범위를 보면 0개다.
//             next는 가장 가까운 하나 { date, title } (없으면 null).
//   overdue   오늘 이전 날에 남은(끝내지 않은) 할 일 개수. 범위 안에서만 센다.
//             기간 일정은 끝나는 날이 오늘 이전일 때만 "지난 일"로 본다.
import { addDays, formatShortDate, getDaysInMonth } from './date';
import { todosOf } from './todos';

const UPCOMING_DAYS = 7;

const pad = (n) => String(n).padStart(2, '0');

// 요약 줄이 셀 범위와 그 이름. 보기마다 다르다.
//   view       'year' | 'month' | 'week'
//   year       보는 해,  month  보는 달(1~12, 월 보기),  weekStart  보는 주의 일요일 'YYYY-MM-DD' (주 보기)
//   today      오늘 'YYYY-MM-DD',  thisYear  앱을 연 해
// 돌려주는 값: { from, to, scope }  from·to는 summarize에 넘길 범위, scope는 카드에 보일 이름
//   연: 그 해 1월 1일 ~ 12월 31일, '올해' 또는 '2027년'
//   월: 그달 1일 ~ 말일, '이달' 또는 '3월'
//   주: 일요일 ~ 토요일, '이번 주' 또는 '11/15–11/21'
export function summaryRange({ view, year, month, weekStart, today, thisYear }) {
  if (view === 'week') {
    const weekEnd = addDays(weekStart, 6);
    const isThisWeek = today >= weekStart && today <= weekEnd;
    return {
      from: weekStart,
      to: weekEnd,
      scope: isThisWeek ? '이번 주' : `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`,
    };
  }
  if (view === 'month') {
    const monthKey = `${year}-${pad(month)}`;
    return {
      from: `${monthKey}-01`,
      to: `${monthKey}-${pad(getDaysInMonth(year, month))}`,
      scope: monthKey === today.slice(0, 7) ? '이달' : `${month}월`,
    };
  }
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    scope: year === thisYear ? '올해' : `${year}년`,
  };
}

export function summarize({ events, timeBlocks, from, to, today, now = '00:00' }) {
  const inRange = (date) => date >= from && date <= to;
  const rangeEvents = events.filter((evt) => evt.start_date <= to && evt.end_date >= from);
  const rangeBlockDays = Object.entries(timeBlocks).filter(([date]) => inRange(date));

  // 할 일
  const allTodos = [
    ...rangeEvents.flatMap(todosOf),
    ...rangeBlockDays.flatMap(([, blocks]) => blocks.flatMap(todosOf)),
  ];
  const todos = { done: allTodos.filter((t) => t.done).length, total: allTodos.length };

  // 7일 이내 주요 일정: [오늘, 6일 뒤]를 범위 [from, to] 안으로 자른 기간
  const windowFrom = today > from ? today : from;
  const lastDay = addDays(today, UPCOMING_DAYS - 1);
  const windowTo = lastDay < to ? lastDay : to;
  const inWindow = (date) => date >= windowFrom && date <= windowTo;
  const soon = windowFrom > windowTo ? [] : [
    ...events.filter((evt) => inWindow(evt.end_date)).map((evt) => ({ date: evt.end_date, time: '', title: evt.title })),
    ...Object.entries(timeBlocks)
      .filter(([date]) => inWindow(date))
      .flatMap(([date, blocks]) => blocks
        .filter((b) => b.is_important && !(date === today && b.end <= now)) // 오늘 이미 끝난 것은 뺀다
        .map((b) => ({ date, time: b.start, title: b.content.trim() || '제목 없음' }))),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const upcoming = { count: soon.length, next: soon[0] ? { date: soon[0].date, title: soon[0].title } : null };

  // 못 끝낸 일
  const left = (list) => list.filter((t) => !t.done).length;
  const overdue = rangeEvents.filter((evt) => evt.end_date < today).reduce((sum, evt) => sum + left(todosOf(evt)), 0)
    + rangeBlockDays.filter(([date]) => date < today).reduce((sum, [, blocks]) => sum + blocks.reduce((s, b) => s + left(todosOf(b)), 0), 0);

  return { todos, upcoming, overdue };
}
