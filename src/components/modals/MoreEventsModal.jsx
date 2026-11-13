import EditIcon from '../icons/EditIcon';
import DeleteIcon from '../icons/DeleteIcon';
import PopupDialog from '../common/PopupDialog';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

// 한 날짜의 전체 일정 목록 팝업. 보일지 말지는 부모가 정한다.
export default function MoreEventsModal({ date, events, dailySchedules, onClose, onEditEvent, onDeleteEvent }) {
  return (
    <PopupDialog maxHeight="80vh" onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{`${date} 전체 일정`}</DialogTitle>
      </DialogHeader>
      <div className="overflow-y-auto flex flex-col gap-2.5 pr-1">
        {events.filter(e => e.start_date <= date && e.end_date >= date).map(evt => (
          <div key={evt.id} style={{ backgroundColor: evt.color }} className="text-white text-xs px-2.5 py-1.5 rounded-sm flex justify-between items-center shadow-xs font-medium w-full min-w-0">
            <span className="truncate flex-1">{evt.title}</span>
            <div className="flex gap-2 items-center shrink-0 ml-2">
              <button onClick={() => onEditEvent(evt)} className="text-white/90 hover:text-white"><EditIcon /></button>
              <button onClick={() => onDeleteEvent(evt)} className="text-white/70 hover:text-white"><DeleteIcon /></button>
            </div>
          </div>
        ))}
        {(dailySchedules[date] || []).filter(s => s.is_important).sort((a,b)=>a.hour-b.hour).map((sch, idx) => (
          <div key={idx} className="text-xs text-foreground flex gap-2 items-center px-2 py-1.5 bg-muted rounded-sm border border-border w-full min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sch.color }}></span>
            <span className="font-semibold text-muted-foreground w-9 shrink-0">{String(sch.hour).padStart(2, '0')}:00</span>
            <span className="truncate flex-1">{sch.content}</span>
          </div>
        ))}
      </div>
    </PopupDialog>
  );
}
