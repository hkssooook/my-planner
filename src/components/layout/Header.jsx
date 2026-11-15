import { useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 화면 맨 위 머리말: "무엇을 볼지" 고르는 곳. 크게 보이는 연도(누르면 연도 목록) 밑에 앱 이름을 부제목으로 둔다.
// (달력 보기 방식 버튼은 달력의 설정이라 달력 상자 위 ViewModeToggle로 옮겼다)
// 선택된 값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
//
// 연도 고르기: "2026년 ⌄" 버튼을 누르면 펼침 상자(shadcn Popover)가 열리고, 그 안에 연도가 세로 탭(shadcn Tabs vertical)으로 놓인다.
// 탭을 누르면(키보드는 ↑↓로 옮겨 Enter) 그 해로 바뀌고 상자가 닫힌다.
export default function Header({ year, years, onYearChange }) {
  const [open, setOpen] = useState(false);
  const selectedTabRef = useRef(null); // 상자가 열리면 지금 연도 탭에 커서를 둔다 (키보드로 바로 ↑↓)

  const pickYear = (value) => {
    onYearChange(value);
    setOpen(false);
  };

  return (
    // 스크롤해도 화면 맨 위에 고정(sticky top-0). 카드만 고정하면 카드 위 빈틈·둥근 모서리 사이로 달력이 비쳐 보이므로,
    // 화면 배경색 띠로 감싸 그 자리를 가린다. 띠는 바깥 여백(24px)만큼 넓혀(-mx-6 -mt-6) 화면 끝까지 덮는다.
    // 겹침 순서: 달력의 고정 칸(z-10·z-20)보다 위, 팝업(z-50)보다 아래인 z-30.
    // 카드 안쪽 여백은 shadcn 카드(Card) 기본값인 24px(p-6)을 쓴다.
    <div className="sticky top-0 z-30 -mx-6 -mt-6 px-6 pt-6 pb-6 bg-background">
      <div className="flex flex-col items-center bg-card p-6 rounded-lg shadow-xs">
        {/* 연도 버튼과 부제목을 한 묶음으로 세우고, 묶음 너비는 연도 버튼 너비를 따른다 (부제목은 그 너비로 늘어난다).
            부제목은 연도 버튼과 같은 자리에 같은 여백을 둔다: 왼쪽 12px, 오른쪽 34px(= 버튼 오른쪽 여백 12px + 사이 간격 6px + ⌄ 16px).
            그러면 "연간 플래너" 글자의 가운데가 ⌄를 뺀 "2026년" 글자의 가운데와 정확히 맞는다. */}
        <div className="inline-flex flex-col gap-1">
          <Popover open={open} onOpenChange={setOpen}>
            {/* 입력칸 상자가 아니라 제목처럼 보이게: 테두리 없이 24px 반굵게. 마우스를 올리면 옅은 바탕이 생겨 누를 수 있음을 알린다.
                좌우 여백은 똑같이 12px(px-3) */}
            <PopoverTrigger
              aria-label={`연도 선택 (지금 ${year}년)`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-2xl font-semibold text-foreground hover:bg-accent outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {year}년
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
          <h1 className="pl-3 pr-[34px] text-center whitespace-nowrap text-sm text-muted-foreground hidden sm:block">연간 플래너</h1>
        </div>
      </div>
    </div>
  );
}
