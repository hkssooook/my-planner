import { COLOR_PALETTE } from '../../constants/colors';
import { eventColors } from '../../utils/color';

// 그날 할 일 상태를 알려 주는 둥근 알약 (리디자인 기획서 "카드 문법": 할 일 = 둥근 알약, 늘 파랑 계열).
// 연·월 보기의 날짜 칸과 주 보기의 보드 칸이 함께 쓴다. 네 가지 모양:
//   오늘: 파랑으로 채움 "할 일 1/3" (흰 글자, 대비 4.54)
//   앞으로의 날: 흰 바탕 + 파랑 테두리 "할 일 3"
//   지난 날에 남은 일: 노랑(앰버 일정 색의 연한 바탕 + 짙은 글자) "! 2개 남음"
//   다 끝냄: 민트(민트 일정 색의 연한 바탕 + 짙은 글자) "✓ 할 일 끝"
// 노랑·민트는 일정 색 팔레트의 앰버·민트를 eventColors()로 계산해 쓴다 (색은 한 곳에서만 정한다)
const tint = (name) => {
  const { background, text } = eventColors(COLOR_PALETTE.find((c) => c.name === name).value);
  return { backgroundColor: background, borderColor: background, color: text };
};
const PILL = {
  today: { className: 'bg-primary text-primary-foreground border-primary' },
  future: { className: 'bg-card text-primary border-surface-blue-3' },
  left: { className: '', style: tint('앰버') },
  done: { className: '', style: tint('민트') },
};

//   pill       utils/todos.js todoPillOf()의 결과 (null이면 아무것도 그리지 않는다)
//   className  놓는 자리에 맞춘 여백 등
export default function TodoPill({ pill, className = '' }) {
  if (!pill) return null;
  return (
    <span
      data-testid="todo-pill" data-kind={pill.kind}
      className={`shrink-0 rounded-full border px-2 text-[11px] font-bold leading-4 ${PILL[pill.kind].className} ${className}`}
      style={PILL[pill.kind].style}
    >
      {pill.text}
    </span>
  );
}
