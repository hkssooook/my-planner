// 팝업 아래쪽 버튼줄. 기본은 오른쪽 정렬이다. (shadcn의 DialogFooter 기본 모양)
//
//   spread  true이면 양쪽으로 갈라서, 첫 번째 자식은 왼쪽, 나머지는 오른쪽에 둔다.
//           삭제처럼 위험한 버튼을 저장 버튼에서 멀리 떼어 놓고 싶을 때 쓴다. (이 경우 오른쪽 버튼들은 하나의 묶음으로 넘긴다)
export default function ModalFooter({ spread = false, children }) {
  return <div className={`flex gap-2 ${spread ? 'justify-between' : 'justify-end'}`}>{children}</div>;
}
