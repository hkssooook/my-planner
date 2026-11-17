import PopupDialog from '../common/PopupDialog';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// 저장 안 한 변경이 있는데 일정 패널을 닫으려 할 때 묻는 팝업. (리디자인 기획서 "저장 규칙" 4번)
// 보일지 말지는 부모가 정하고, 이 부품은 모양과 세 버튼 동작만 맡는다.
//   changeCount  저장 안 한 변경 개수
//   onSave       [저장하고 닫기],  onDiscard  [버리고 닫기],  onCancel  [취소] (닫지 않는다)
export default function UnsavedCloseModal({ changeCount, onSave, onDiscard, onCancel }) {
  return (
    <PopupDialog width="sm">
      <DialogHeader>
        <DialogTitle>저장하지 않은 변경이 있어요</DialogTitle>
        <DialogDescription>저장 안 한 변경 {changeCount}개가 있어요. 패널을 닫기 전에 저장할까요?</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>취소</Button>
        <Button variant="destructive" onClick={onDiscard}>버리고 닫기</Button>
        <Button onClick={onSave}>저장하고 닫기</Button>
      </DialogFooter>
    </PopupDialog>
  );
}
