import ColorPicker from '../common/ColorPicker';
import DeleteIcon from '../icons/DeleteIcon';
import ModalShell from '../common/ModalShell';

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
    <ModalShell width="lg" panelClassName="flex flex-col max-h-[90vh]">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
        <div>
          <h2 className="text-lg font-bold text-gray-900">상세 일정 관리</h2>
          <p className="text-sm text-gray-600 mt-1">{date}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><DeleteIcon /></button>
      </div>
          
      <div className="p-5 overflow-y-auto flex flex-col gap-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">전체(종일) 일정 추가 <span className="font-normal text-gray-400 text-xs ml-1">(선택 사항)</span></h3>
          <div className="flex gap-3 items-center">
            <input 
              type="text" placeholder="예: 워크숍 일정" value={allDayTitle} 
              onChange={(e) => onAllDayTitleChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <ColorPicker size="md" value={allDayColor} onChange={onAllDayColorChange} />
          </div>
        </section>

        <section className="border-t border-gray-100 pt-5">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-semibold text-gray-800">시간대별 개별 일정</h3>
            <span className="text-[10px] text-gray-500">우측 체크 시 달력 표출</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-2">
            {slots.map((item) => (
              <div key={item.hour} className="flex gap-2 items-center bg-white p-1 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100">
                <span className="text-xs font-medium text-gray-500 w-10 text-right flex-shrink-0">{String(item.hour).padStart(2, '0')}:00</span>
                <input 
                  type="text" placeholder="내용 입력" value={item.content}
                  onChange={(e) => onSlotChange(item.hour, 'content', e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-400 min-w-0"
                />
                <ColorPicker size="sm" value={item.color} onChange={(color) => onSlotChange(item.hour, 'color', color)} />
                <label className="flex items-center gap-1 cursor-pointer w-12 justify-end flex-shrink-0">
                  <input 
                    type="checkbox" checked={item.is_important}
                    onChange={(e) => onSlotChange(item.hour, 'is_important', e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-[10px] text-gray-600 font-medium">주요</span>
                </label>
              </div>
            ))}
          </div>
        </section>
      </div>
          
      <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-xl">
        <button onClick={onClose} className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">취소</button>
        <button onClick={onSave} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600">통합 저장</button>
      </div>
    </ModalShell>
  );
}
