import ColorPicker from '../common/ColorPicker';
import PopupDialog from '../common/PopupDialog';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// 상세 일정 관리 팝업: 위쪽은 종일 일정, 아래쪽은 시간대별(0~23시) 24줄.
// 입력값은 모두 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
// slots: [{ hour, content, color, is_important }]  /  onSlotChange(hour, 바뀐항목, 값)
export default function DailyDetailModal({
  date,
  allDayTitle, allDayColor, onAllDayTitleChange, onAllDayColorChange,
  slots, onSlotChange,
  onSave, onClose,
}) {
  return (
    <PopupDialog width="lg" maxHeight="90vh" onClose={onClose}>
      <DialogHeader>
        <DialogTitle>상세 일정 관리</DialogTitle>
        <DialogDescription>{date}</DialogDescription>
      </DialogHeader>

      <div className="overflow-y-auto flex flex-col gap-6">
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">전체(종일) 일정 추가 <span className="font-normal text-muted-foreground text-xs ml-1">(선택 사항)</span></h3>
          <div className="flex gap-3 items-center">
            <input 
              type="text" placeholder="예: 워크숍 일정" aria-label="전체(종일) 일정명" value={allDayTitle} 
              onChange={(e) => onAllDayTitleChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
            />
            <ColorPicker size="md" label="전체(종일) 일정 색" value={allDayColor} onChange={onAllDayColorChange} />
          </div>
        </section>

        <section className="border-t border-border pt-5">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-semibold text-foreground">시간대별 개별 일정</h3>
            <span className="text-[10px] text-muted-foreground">우측 체크 시 달력에 ★ 표시</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
            {slots.map((item) => (
              <div key={item.hour} className="flex gap-2 items-center bg-card p-1 rounded-sm hover:bg-muted border border-transparent hover:border-border">
                <span className="text-xs font-medium text-muted-foreground w-10 text-right shrink-0">{String(item.hour).padStart(2, '0')}:00</span>
                <input 
                  type="text" placeholder="내용 입력" aria-label={`${String(item.hour).padStart(2, '0')}:00 일정 내용`} value={item.content}
                  onChange={(e) => onSlotChange(item.hour, 'content', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-border rounded-sm text-sm focus:outline-hidden focus:border-ring min-w-0"
                />
                <ColorPicker size="sm" label={`${String(item.hour).padStart(2, '0')}:00 일정 색`} value={item.color} onChange={(color) => onSlotChange(item.hour, 'color', color)} />
                <label className="flex items-center gap-1 cursor-pointer w-12 justify-end shrink-0">
                  <input 
                    type="checkbox" aria-label={`${String(item.hour).padStart(2, '0')}:00 주요 일정 (★ 표시)`} checked={item.is_important}
                    onChange={(e) => onSlotChange(item.hour, 'is_important', e.target.checked)}
                    className="w-3.5 h-3.5 text-primary rounded-sm border-input"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium">주요</span>
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>취소</Button>
        <Button onClick={onSave}>통합 저장</Button>
      </DialogFooter>
    </PopupDialog>
  );
}
