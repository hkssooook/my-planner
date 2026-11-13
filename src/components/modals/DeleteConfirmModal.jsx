import ModalShell from '../common/ModalShell';

// 삭제 확인 팝업. 보일지 말지는 부모가 정하고, 이 부품은 모양과 두 버튼 동작만 맡는다.
export default function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    <ModalShell layer="confirm" overlay="dark" width="xs" radius="lg" stopMouseUp={false} panelClassName="p-5 flex flex-col gap-4">
      <h3 className="text-md font-semibold text-gray-900">일정 삭제</h3>
      <p className="text-sm text-gray-600">이 일정을 완전히 삭제하시겠습니까?</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium">취소</button>
        <button onClick={onConfirm} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">확인</button>
      </div>
    </ModalShell>
  );
}
