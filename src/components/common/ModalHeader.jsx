import DeleteIcon from '../icons/DeleteIcon';

// 팝업의 제목줄: 제목 + (있으면) 설명 + (있으면) 오른쪽 위 닫기 버튼.
// shadcn의 DialogHeader / DialogTitle / DialogDescription 구성과 같은 모양이다.
//
//   title        제목 (필수)
//   description  제목 아래 작은 회색 글씨 (예: 날짜, 안내 문구)
//   onClose      주면 오른쪽 위에 X 버튼이 나타나고, 누르면 호출된다
export default function ModalHeader({ title, description, onClose }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg leading-none font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <DeleteIcon />
        </button>
      )}
    </div>
  );
}
