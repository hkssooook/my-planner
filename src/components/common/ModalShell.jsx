// 팝업(모달)의 바깥쪽 두 겹: 화면 전체를 덮는 어두운 배경 + 가운데의 흰 상자.
// 제목, 입력칸, 버튼 같은 안쪽 내용은 쓰는 쪽이 children으로 넣는다.
//
// 아래 옵션들은 팝업 5개가 지금 각자 다르게 쓰고 있는 값을 그대로 재현하기 위한 것이다.
// (이후 모양을 통일하면서 대부분 하나로 합쳐질 예정)

// Tailwind는 완성된 클래스 이름이 코드에 글자 그대로 있어야 스타일을 만들므로, 조립하지 않고 통째로 적어 둔다.

// 겹침 순서: 숫자가 큰 팝업이 위에 뜬다. (더보기 < 수정 < 삭제 확인)
const LAYERS = {
  base: 'z-50',
  more: 'z-[60]',
  edit: 'z-[70]',
  confirm: 'z-[80]',
};

// 뒤 화면을 가리는 어두운 정도
const OVERLAYS = {
  normal: 'bg-black/50',
  dark: 'bg-black/60',
};

// 상자의 최대 너비
const WIDTHS = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  lg: 'max-w-lg',
};

// 상자의 모서리 둥글기
const RADII = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

export default function ModalShell({
  layer = 'base',
  overlay = 'normal',
  width = 'sm',
  radius = 'xl',
  stopMouseUp = true, // 팝업 위에서 마우스를 놓는 동작이 뒤쪽 달력의 날짜 끌기 감지에 전달되지 않게 막는다
  panelClassName = '', // 팝업마다 다른 여백, 높이, 배치
  children,
}) {
  return (
    <div
      className={`fixed inset-0 ${OVERLAYS[overlay]} flex items-center justify-center ${LAYERS[layer]} p-4`}
      onMouseUp={stopMouseUp ? (e) => e.stopPropagation() : undefined}
    >
      <div className={`bg-white ${RADII[radius]} shadow-xl w-full ${WIDTHS[width]} ${panelClassName}`}>
        {children}
      </div>
    </div>
  );
}
