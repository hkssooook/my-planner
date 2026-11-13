import ColorPicker from '../common/ColorPicker';
import ModalShell from '../common/ModalShell';
import ModalHeader from '../common/ModalHeader';
import ModalFooter from '../common/ModalFooter';
import Button from '../common/Button';

// 기간 일정 등록 팝업. 입력값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
// onChange는 바뀐 부분만 받는다. 예: onChange({ title: '새 제목' })
export default function PeriodEventModal({ event, onChange, onClose, onSave }) {
  return (
    <ModalShell>
      <ModalHeader title="기간 일정 등록" description={`${event.start_date} ~ ${event.end_date}`} onClose={onClose} />
      <div className="flex flex-col gap-5">
        <div>
          <input 
            type="text" placeholder="일정명 입력" value={event.title} 
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-400 text-sm"
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
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>취소</Button>
        <Button onClick={onSave}>저장</Button>
      </ModalFooter>
    </ModalShell>
  );
}
