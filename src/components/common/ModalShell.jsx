// 팝업(모달)의 바깥쪽 두 겹: 화면 전체를 덮는 어두운 배경 + 가운데의 흰 상자.
// 상자 안은 위에서 아래로 ModalHeader(제목) → 내용 → ModalFooter(버튼)를 쌓는다. 안쪽 여백과 간격은 이 상자가 정한다.
// (shadcn의 Dialog / DialogContent 구성과 같은 모양: 안쪽 여백 p-6, 칸 사이 간격 gap-4)

// Tailwind는 완성된 클래스 이름이 코드에 글자 그대로 있어야 스타일을 만들므로, 조립하지 않고 통째로 적어 둔다.

// 겹침 순서: 숫자가 큰 팝업이 위에 뜬다. (더보기 < 수정 < 삭제 확인)
const LAYERS = {
  base: 'z-50',
  more: 'z-60',
  edit: 'z-70',
  confirm: 'z-80',
};

// 상자의 최대 너비
const WIDTHS = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  lg: 'max-w-lg',
};

// 상자의 최대 높이: 넘치면 안쪽 내용이 스크롤된다. (안 정하면 제한 없음)
const MAX_HEIGHTS = {
  '80vh': 'max-h-[80vh]',
  '90vh': 'max-h-[90vh]',
};

export default function ModalShell({
  layer = 'base',
  width = 'sm',
  maxHeight,
  children,
}) {
  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center ${LAYERS[layer]} p-4`}
      // 팝업 위에서 마우스를 놓는 동작이 뒤쪽 달력의 날짜 끌기 감지에 전달되지 않게 막는다
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${WIDTHS[width]} p-6 flex flex-col gap-4 ${maxHeight ? MAX_HEIGHTS[maxHeight] : ''}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
