// 보기별 색 (리디자인 기획서 "보기별 색"): 연 = 파랑, 월 = 앰버, 주 = 민트.
// 색 값 자체는 constants/colors.js의 BACKGROUND_SCALES와 index.css의 --surface-<색>-1~5에 있다.
// 여기는 "어느 보기에서 어느 단계 색을 쓰는지"만 정한다.
//
// Tailwind는 파일에 적힌 클래스 이름 글자를 보고 CSS를 만든다.
// 그래서 'bg-surface-' + theme처럼 이어 붙이지 말고, 클래스 이름을 아래처럼 통째로 적어야 한다.

// 보기 → 색 이름
export const VIEW_THEME = { year: 'blue', month: 'amber', week: 'mint' };

// 화면 전체 바탕: 보기 색 5단계 (파랑은 기본 바탕 bg-background가 곧 파랑 5단계)
export const PAGE_BACKGROUND = {
  blue: 'bg-background',
  amber: 'bg-surface-amber-5',
  mint: 'bg-surface-mint-5',
};

// 달력 영역 바탕: 보기 색 2단계. 그 위에 날짜 칸(1단계, 흰색)이 떠 보인다
export const CALENDAR_BACKGROUND = {
  blue: 'bg-surface-blue-2',
  amber: 'bg-surface-amber-2',
  mint: 'bg-surface-mint-2',
};
