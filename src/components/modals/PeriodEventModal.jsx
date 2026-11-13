import ColorPicker from '../common/ColorPicker';
import DeleteIcon from '../icons/DeleteIcon';
import ModalShell from '../common/ModalShell';

// 기간 일정 등록 팝업. 입력값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
// onChange는 바뀐 부분만 받는다. 예: onChange({ title: '새 제목' })
export default function PeriodEventModal({ event, onChange, onClose, onSave }) {
  return (
    <ModalShell panelClassName="flex flex-col">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">기간 일정 등록</h2>
          <p className="text-sm text-gray-600 mt-1">{event.start_date} ~ {event.end_date}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><DeleteIcon /></button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        <div>
          <input 
            type="text" placeholder="일정명 입력" value={event.title} 
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-2 block">지정색</label>
          <ColorPicker
            value={event.color}
            onChange={(color) => onChange({ color })}
          />
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-xl">
        <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">취소</button>
        <button onClick={onSave} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">저장</button>
      </div>
    </ModalShell>
  );
}
