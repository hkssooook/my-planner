// 팝업 아래쪽에 놓는 동작 버튼(저장, 취소, 삭제 등). 종류(variant)로 모양을 정한다.
// 종류 이름은 색 규정 문서(docs/design-tokens.md)의 이름과 같다. 색 값은 이후 shadcn 도입 때 그 문서의 값으로 바꾼다.
//
//   primary          주 동작 (저장)
//   outline          취소처럼 부담 없는 동작 (흰 바탕 + 테두리)
//   destructive      되돌릴 수 없는 확정 동작 (삭제 확인)
//   destructive-soft 삭제를 시작하는 약한 버튼 (수정 팝업의 삭제)

// Tailwind는 완성된 클래스 이름이 코드에 글자 그대로 있어야 스타일을 만들므로, 조립하지 않고 통째로 적어 둔다.
const BASE = 'px-4 py-2 rounded-md text-sm font-medium';

const VARIANTS = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600',
  outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  'destructive-soft': 'bg-red-50 text-red-700 hover:bg-red-100',
};

// className에는 배치만 덧붙인다. 예: className="flex-1" (버튼줄에서 남는 폭을 나눠 가짐)
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
