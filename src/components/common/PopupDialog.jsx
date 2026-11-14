import { Dialog, DialogContent } from '@/components/ui/dialog';

// 이 앱의 모든 팝업이 공통으로 쓰는 shadcn Dialog 한 겹.
// 팝업의 "보일지 말지"는 부모가 정하므로(부모가 이 부품을 그리면 열린 것) 항상 열린 상태로 그린다.
//
//   width      상자의 최대 너비 (xs / sm / lg)
//   maxHeight  상자의 최대 높이 (80vh / 90vh). 넘치면 안쪽 내용이 스크롤된다.
//   onClose    주면 오른쪽 위에 닫기(X) 버튼이 생기고, 누르면 호출된다. 안 주면 X 버튼이 없다.
//   initialFocus  열릴 때 커서를 놓을 곳 (ref 또는 요소를 돌려주는 함수). 안 주면 팝업이 알아서 정한다.
//
// 닫는 방법은 닫기 버튼과 각 팝업의 버튼뿐이다. (Esc 키나 바깥 클릭으로는 닫히지 않는다 — 이 앱의 원래 동작)
// 겹침 순서: 나중에 열린 팝업이 위에 뜬다. (더보기 → 수정 → 삭제 확인 순으로 열리므로 따로 숫자를 정하지 않는다)

// Tailwind는 완성된 클래스 이름이 코드에 글자 그대로 있어야 스타일을 만들므로, 조립하지 않고 통째로 적어 둔다.
const WIDTHS = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  lg: 'sm:max-w-lg',
};

const MAX_HEIGHTS = {
  '80vh': 'max-h-[80vh]',
  '90vh': 'max-h-[90vh]',
};

export default function PopupDialog({ width = 'sm', maxHeight, onClose, initialFocus, children }) {
  return (
    // 팝업 위에서 마우스를 놓는 동작이 뒤쪽 달력의 날짜 끌기 감지에 전달되지 않게 막는다
    // (팝업은 화면 맨 끝에 따로 그려지지만, React 이벤트는 이 부모까지 올라오므로 여기서 막을 수 있다)
    <div className="contents" onMouseUp={(e) => e.stopPropagation()}>
      <Dialog
        open
        onOpenChange={(open, details) => {
          if (!open && details.reason === 'close-press') onClose?.();
        }}
      >
        <DialogContent
          showCloseButton={Boolean(onClose)}
          initialFocus={initialFocus}
          className={`${WIDTHS[width]} ${maxHeight ? `flex flex-col ${MAX_HEIGHTS[maxHeight]}` : ''}`.trim()}
        >
          {children}
        </DialogContent>
      </Dialog>
    </div>
  );
}
