import ColorPicker from '../common/ColorPicker';
import PopupDialog from '../common/PopupDialog';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// 일정 수정 팝업. 수정 중인 값은 부모(App)가 들고 있다.
// onChange는 바뀐 부분만 받고, onDelete는 삭제 확인 팝업을 띄우는 일을 부모에게 맡긴다.
export default function EditEventModal({ event, onChange, onSave, onClose, onDelete }) {
  return (
    <PopupDialog>
      <DialogHeader>
        <DialogTitle>일정 수정</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">일정명</label>
          <input 
            type="text" value={event.title} 
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-1 block">시작일</label>
            <input 
              type="date" value={event.start_date} 
              onChange={(e) => onChange({ start_date: e.target.value })}
              className="w-full h-9 px-2 py-1.5 border border-input rounded-md text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-1 block">종료일</label>
            <input 
              type="date" value={event.end_date} 
              onChange={(e) => onChange({ end_date: e.target.value })}
              className="w-full h-9 px-2 py-1.5 border border-input rounded-md text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">지정색</label>
          <ColorPicker
            value={event.color}
            onChange={(color) => onChange({ color })}
          />
        </div>
      </div>
      <DialogFooter className="sm:justify-between">
        <Button variant="destructive" onClick={onDelete}>삭제</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={onSave}>변경 저장</Button>
        </div>
      </DialogFooter>
    </PopupDialog>
  );
}
