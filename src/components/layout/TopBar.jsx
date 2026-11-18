import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import ViewModeToggle from '../calendar/ViewModeToggle';
import Header from './Header';
import ViewTabs from './ViewTabs';

// 상단 바 한 줄: 왼쪽은 기간 캡슐, 오른쪽 끝은 연·월·주 탭, (연 보기만) 보기 방식 탭, "새 일정" 버튼
//   nav               useCalendarNav()가 돌려준 값 (보기, 보는 해·달·주, 바꾸는 함수)
//   isWrapMode        연 보기의 화면 맞춤 여부,  onWrapModeChange  바꿀 때
//   onToday           "오늘" 버튼
//   onNewEvent        "새 일정" 버튼
export default function TopBar({ nav, isWrapMode, onWrapModeChange, onToday, onNewEvent }) {
  const { view, isMonthView, isWeekView, theme, currentYear, currentMonth, weekStart } = nav;

  return (
    <div className="flex items-center gap-3 mb-3 shrink-0">
      <Header
        year={currentYear} onYearChange={nav.changeYear} years={nav.yearOptions} onToday={onToday}
        theme={theme}
        month={isMonthView ? currentMonth : null}
        onMonthChange={nav.changeMonth}
        weekStart={isWeekView ? weekStart : null}
        onWeekChange={nav.changeWeek}
      />
      <div className="ml-auto flex items-center gap-3">
        <ViewTabs view={view} onViewChange={nav.changeView} />
        {/* 가로 스크롤 / 화면 맞춤은 연 보기에만 있는 설정 */}
        {view === 'year' && <ViewModeToggle isWrapMode={isWrapMode} onWrapModeChange={onWrapModeChange} />}
        {/* 새 일정: 열린 날(없으면 오늘)의 일정 패널 + 새 일정 패널(시간 일정) */}
        <Button className="h-10 rounded-full px-4 font-semibold" onClick={onNewEvent}>
          <Plus aria-hidden="true" />새 일정
        </Button>
      </div>
    </div>
  );
}
