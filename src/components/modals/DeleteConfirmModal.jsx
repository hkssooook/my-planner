import PopupDialog from '../common/PopupDialog';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// 삭제 확인 팝업. 보일지 말지는 부모가 정하고, 이 부품은 모양과 두 버튼 동작만 맡는다.
export default function DeleteConfirmModal({ onCancel, onConfirm }) {
  return (
    <PopupDialog width="xs">
      <DialogHeader>
        <DialogTitle>일정 삭제</DialogTitle>
        <DialogDescription>이 일정을 완전히 삭제하시겠습니까?</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button variant="destructive" onClick={onConfirm}>확인</Button>
      </DialogFooter>
    </PopupDialog>
  );
}
