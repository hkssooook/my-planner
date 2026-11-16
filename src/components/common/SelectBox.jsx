import { ChevronDown } from 'lucide-react';

// 작은 드롭박스 (시간 고르기 등). 브라우저 기본 <select>는 오른쪽 화살표가 테두리에 거의 붙어서
// 왼쪽 글자 여백보다 좁아 보인다. 그래서 기본 화살표를 숨기고(appearance-none) 화살표 아이콘을 직접 넣어
// 왼쪽 글자 여백과 오른쪽 화살표 여백을 똑같이 10px로 맞춘다.
//   나머지 속성(aria-label, value, onChange, children의 <option> 등)은 <select>에 그대로 넘긴다.
export default function SelectBox({ className = '', children, ...props }) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        {...props}
        // 왼쪽 10px(pl-2.5) | 글자 | 6px | 화살표 14px | 오른쪽 10px  →  pr = 10 + 14 + 6 = 30px
        className="appearance-none pl-2.5 pr-[30px] py-1 border border-input rounded-sm bg-card cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
    </span>
  );
}
