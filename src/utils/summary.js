// 요약 줄(상단 바 아래 카드 세 장)에 보여 줄 숫자를 계산한다. (리디자인 기획서 ② 요약 줄)
// 화면과 상관없는 계산만 한다. 저장된 일정(달력에 보이는 것)을 넘겨받는다.
//
//   events      기간·종일 일정 [{ id, title, start_date, end_date, todos? }]
//   timeBlocks  날짜별 시간 카드 { 'YYYY-MM-DD': [{ id, start, content, is_important, todos? }] }
//   from, to    범위 'YYYY-MM-DD' (둘 다 포함). 예: 연 보기는 그 해 1월 1일 ~ 12월 31일
//   today       오늘 'YYYY-MM-DD'
//
// 돌려주는 값
//   todos     { done, total }  범위 안의 할 일 (범위에 걸친 기간·종일 일정 + 범위 안 날짜의 시간 카드)
//   upcoming  { count, next }  오늘부터 7일 안(오늘 포함)에 끝나는 기간·종일 일정 + 그 기간의 ★ 시간 일정.
//             next는 가장 가까운 하나 { date, title } (없으면 null). 범위와 상관없이 오늘 기준이다.
//   overdue   오늘 이전 날에 남은(끝내지 않은) 할 일 개수. 범위 안에서만 센다.
//             기간 일정은 끝나는 날이 오늘 이전일 때만 "지난 일"로 본다.
import { addDays } from './date';
import { todosOf } from './todos';

const UPCOMING_DAYS = 7;

export function summarize({ events, timeBlocks, from, to, today }) {
  const inRange = (date) => date >= from && date <= to;
  const rangeEvents = events.filter((evt) => evt.start_date <= to && evt.end_date >= from);
  const rangeBlockDays = Object.entries(timeBlocks).filter(([date]) => inRange(date));

  // 할 일
  const allTodos = [
    ...rangeEvents.flatMap(todosOf),
    ...rangeBlockDays.flatMap(([, blocks]) => blocks.flatMap(todosOf)),
  ];
  const todos = { done: allTodos.filter((t) => t.done).length, total: allTodos.length };

  // 다가오는 일정: 오늘 ~ 6일 뒤
  const last = addDays(today, UPCOMING_DAYS - 1);
  const soon = [
    ...events.filter((evt) => evt.end_date >= today && evt.end_date <= last).map((evt) => ({ date: evt.end_date, time: '', title: evt.title })),
    ...Object.entries(timeBlocks)
      .filter(([date]) => date >= today && date <= last)
      .flatMap(([date, blocks]) => blocks.filter((b) => b.is_important).map((b) => ({ date, time: b.start, title: b.content.trim() || '제목 없음' }))),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const upcoming = { count: soon.length, next: soon[0] ? { date: soon[0].date, title: soon[0].title } : null };

  // 못 끝낸 일
  const left = (list) => list.filter((t) => !t.done).length;
  const overdue = rangeEvents.filter((evt) => evt.end_date < today).reduce((sum, evt) => sum + left(todosOf(evt)), 0)
    + rangeBlockDays.filter(([date]) => date < today).reduce((sum, [, blocks]) => sum + blocks.reduce((s, b) => s + left(todosOf(b)), 0), 0);

  return { todos, upcoming, overdue };
}
