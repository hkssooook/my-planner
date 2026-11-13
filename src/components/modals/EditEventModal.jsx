import ColorPicker from '../common/ColorPicker';

// 일정 수정 팝업. 수정 중인 값은 부모(App)가 들고 있다.
// onChange는 바뀐 부분만 받고, onDelete는 삭제 확인 팝업을 띄우는 일을 부모에게 맡긴다.
export default function EditEventModal({ event, onChange, onSave, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onMouseUp={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <h2 className="text-lg font-semibold text-gray-900">일정 수정</h2>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">일정명</label>
          <input 
            type="text" value={event.title} 
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">시작일</label>
            <input 
              type="date" value={event.start_date} 
              onChange={(e) => onChange({ start_date: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">종료일</label>
            <input 
              type="date" value={event.end_date} 
              onChange={(e) => onChange({ end_date: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">지정색</label>
          <ColorPicker
            value={event.color}
            onChange={(color) => onChange({ color })}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onDelete} className="px-4 py-2 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100">삭제</button>
          <div className="flex-1 flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">취소</button>
            <button onClick={onSave} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">변경 저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
