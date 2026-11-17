import { useRef, useState } from 'react';
import { ChevronDownIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addDays, formatWeekRange } from '../../utils/date';

// 화면 맨 위 상단 바: "무엇을 볼지" 고르는 곳. (리디자인 기획서 ① 상단 바)
//   흰 캡슐 하나에 [‹] 2026년 ⌄ [›] [오늘] 을 담는다. 캡슐이 흰색이라 진한 화면 바탕(파랑 5단계) 위에서도 연도 글자가 잘 읽힌다.
//   연도 글자 아래에는 앱 이름("연간 플래너")을 작게 둔다.
// 선택된 값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
//
// 연도 고르기: "2026년 ⌄" 버튼을 누르면 펼침 상자(shadcn Popover)가 열리고, 그 안에 연도가 세로 탭(shadcn Tabs vertical)으로 놓인다.
// 탭을 누르면(키보드는 ↑↓로 옮겨 Enter) 그 해로 바뀌고 상자가 닫힌다.
// ‹ ›는 고를 수 있는 연도 목록(years) 안에서만 한 해씩 넘긴다. 목록 끝에서는 눌리지 않는다.
// 월 보기(month가 있을 때): 기간 이름이 "2026년 11월"이 되고, ‹ ›는 한 달씩 넘긴다 (역시 연도 목록 안에서만).
// "오늘"은 부모에게 알리기만 한다 (오늘로 돌아가 오늘 칸을 보여 주는 일은 App이 한다).
//
//   theme  보기 색 'blue'(연) | 'amber'(월): ‹ ›·오늘 버튼 바탕이 그 색 2단계가 된다
//   month, onMonthChange(year, month)  월 보기일 때만
//   weekStart, onWeekChange(start)  주 보기일 때만. weekStart는 그 주 일요일 'YYYY-MM-DD'. ‹ ›는 한 주씩
//   theme에 'mint'(주)도 있다
// Tailwind는 완성된 클래스 이름이 코드에 글자 그대로 있어야 하므로 보기 색마다 통째로 적어 둔다.
const THEME = {
  blue: { button: 'bg-surface-blue-2 hover:bg-surface-blue-3', title: 'text-primary hover:bg-surface-blue-2' },
  amber: { button: 'bg-surface-amber-2 hover:bg-surface-amber-3', title: 'text-foreground hover:bg-surface-amber-2' },
  mint: { button: 'bg-surface-mint-2 hover:bg-surface-mint-3', title: 'text-foreground hover:bg-surface-mint-2' },
};

export default function Header({ year, years, onYearChange, onToday, theme = 'blue', month = null, onMonthChange, weekStart = null, onWeekChange }) {
  const [open, setOpen] = useState(false);
  const selectedTabRef = useRef(null); // 상자가 열리면 지금 연도 탭에 커서를 둔다 (키보드로 바로 ↑↓)

  const pickYear = (value) => {
    onYearChange(value);
    setOpen(false);
  };

  const index = years.indexOf(year);
  const prevYear = index > 0 ? years[index - 1] : null;
  const nextYear = index >= 0 && index < years.length - 1 ? years[index + 1] : null;
  const colors = THEME[theme];

  // ‹ ›: 연 보기는 한 해, 월 보기는 한 달, 주 보기는 한 주. 고를 수 있는 연도 목록을 벗어나면 null(누를 수 없음)
  const isMonth = month !== null;
  const isWeek = weekStart !== null;
  const inYears = (dateString) => years.includes(Number(dateString.slice(0, 4)));
  let prev; let next;
  if (isWeek) {
    const before = addDays(weekStart, -7);
    const after = addDays(weekStart, 7);
    prev = inYears(addDays(before, 6)) ? [before] : null; // 그 주의 마지막 날이 목록 안이면 된다
    next = inYears(after) ? [after] : null;
  } else if (isMonth) {
    prev = month > 1 ? [year, month - 1] : prevYear !== null ? [prevYear, 12] : null;
    next = month < 12 ? [year, month + 1] : nextYear !== null ? [nextYear, 1] : null;
  } else {
    prev = prevYear !== null ? [prevYear] : null;
    next = nextYear !== null ? [nextYear] : null;
  }
  const go = (target) => {
    if (isWeek) onWeekChange(target[0]);
    else if (isMonth) onMonthChange(target[0], target[1]);
    else onYearChange(target[0]);
  };
  const unit = isWeek ? ['지난주', '다음 주'] : isMonth ? ['지난달', '다음 달'] : ['지난해', '다음 해'];

  // ‹ › 버튼: 보기 색 2단계 바탕의 동그란 버튼 (흰 캡슐 위에서 누를 수 있는 곳임을 알린다)
  const arrowClass = `rounded-full text-foreground ${colors.button}`;

  return (
    // 화면은 스크롤되지 않고 달력 상자만 안에서 스크롤하므로, 상단 바는 따로 고정하지 않아도 늘 맨 위에 있다.
    // 겹침 순서: 연도 선택 목록이 달력의 고정 칸(z-10·z-20)보다 위에 보이도록 z-30, 팝업(z-50)보다는 아래.
    <header className="relative z-30 shrink-0 flex items-center">
      <div data-testid="period-capsule" className="flex items-center gap-2 bg-card rounded-full p-1.5 shadow-xs">
        <Button
          variant="ghost" size="icon" className={arrowClass}
          aria-label={unit[0]} disabled={prev === null}
          onClick={() => go(prev)}
        >
          <ChevronLeft />
        </Button>

        {/* 연도 버튼과 앱 이름을 한 묶음으로 세우고, 묶음 너비는 연도 버튼 너비를 따른다.
            앱 이름은 연도 버튼과 같은 여백을 둔다: 왼쪽 12px, 오른쪽 34px(= 버튼 오른쪽 여백 12px + 사이 간격 6px + ⌄ 16px).
            그러면 "연간 플래너" 글자의 가운데가 ⌄를 뺀 "2026년" 글자의 가운데와 맞는다. */}
        <div className="inline-flex flex-col">
          <Popover open={open} onOpenChange={setOpen}>
            {/* 입력칸 상자가 아니라 제목처럼 보이게: 테두리 없이 24px 반굵게, 글자는 파랑(primary, 흰 바탕과 대비 4.54).
                마우스를 올리면 파랑 2단계 바탕이 생겨 누를 수 있음을 알린다 */}
            <PopoverTrigger
              aria-label={`연도 선택 (지금 ${year}년)`}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-0.5 text-2xl font-semibold ${colors.title} outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
            >
              {isWeek ? formatWeekRange(weekStart) : `${year}년${isMonth ? ` ${month}월` : ''}`}
              <ChevronDownIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto p-1" initialFocus={selectedTabRef}>
              {/* 고르는 일은 각 탭의 클릭(키보드 Enter·Space도 클릭)으로 한다. 지금 연도를 다시 눌러도 상자가 닫히게 하려고
                  값이 바뀔 때만 오는 onValueChange 대신 onClick을 쓴다 */}
              <Tabs orientation="vertical" value={year}>
                <TabsList aria-label="연도">
                  {years.map((y) => (
                    <TabsTrigger key={y} value={y} ref={y === year ? selectedTabRef : undefined} onClick={() => pickYear(y)} className="px-3">{y}년</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </PopoverContent>
          </Popover>
          {/* 흐린 글자는 흰 바탕 위에서 대비 6.17로 읽힌다 */}
          <h1 className="pl-3 pr-[34px] text-center text-xs text-muted-foreground whitespace-nowrap">연간 플래너</h1>
        </div>

        <Button
          variant="ghost" size="icon" className={arrowClass}
          aria-label={unit[1]} disabled={next === null}
          onClick={() => go(next)}
        >
          <ChevronRight />
        </Button>

        {/* 오늘: 보기 색 2단계 바탕 + 기본 글자의 알약 버튼 (기본 글자는 파랑 2단계 위 10.49, 앰버 2단계 위 11.33) */}
        <Button
          variant="ghost" className={`ml-1 mr-1 h-9 rounded-full px-4 text-foreground font-semibold ${colors.button}`}
          onClick={onToday}
        >
          오늘
        </Button>
      </div>
    </header>
  );
}
