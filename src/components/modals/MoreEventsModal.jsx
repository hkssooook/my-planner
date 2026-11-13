import EditIcon from '../icons/EditIcon';
import DeleteIcon from '../icons/DeleteIcon';

// 한 날짜의 전체 일정 목록 팝업. 보일지 말지는 부모가 정한다.
export default function MoreEventsModal({ date, events, dailySchedules, onClose, onEditEvent, onDeleteEvent }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onMouseUp={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-900">{date} 전체 일정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><DeleteIcon /></button>
        </div>
        <div className="overflow-y-auto flex flex-col gap-2.5 pr-1">
          {events.filter(e => e.start_date <= date && e.end_date >= date).map(evt => (
            <div key={evt.id} style={{ backgroundColor: evt.color }} className="text-white text-xs px-2.5 py-1.5 rounded flex justify-between items-center shadow-sm font-medium w-full min-w-0">
              <span className="truncate flex-1">{evt.title}</span>
              <div className="flex gap-2 items-center flex-shrink-0 ml-2">
                <button onClick={() => onEditEvent(evt)} className="text-white hover:text-gray-200"><EditIcon /></button>
                <button onClick={() => onDeleteEvent(evt)} className="text-red-100 hover:text-white"><DeleteIcon /></button>
              </div>
            </div>
          ))}
          {(dailySchedules[date] || []).filter(s => s.is_important).sort((a,b)=>a.hour-b.hour).map((sch, idx) => (
            <div key={idx} className="text-xs text-gray-700 flex gap-2 items-center px-2 py-1.5 bg-gray-50 rounded border border-gray-100 w-full min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sch.color }}></span>
              <span className="font-semibold text-gray-500 w-9 flex-shrink-0">{String(sch.hour).padStart(2, '0')}:00</span>
              <span className="truncate flex-1">{sch.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
