// 연간 달력의 보기 방식 버튼: 가로 스크롤(한 달을 한 줄로) / 화면 맞춤(화면 폭에 맞춰 줄바꿈).
// 화면 전체가 아니라 달력에만 쓰이는 설정이라, 머리말이 아니라 달력 상자 바로 위에 둔다.
// 선택된 값은 부모(App)가 들고 있고, 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
export default function ViewModeToggle({ isWrapMode, onWrapModeChange }) {
  const buttonClass = (selected) =>
    `px-3 py-1.5 text-xs font-medium rounded-xs transition-all ${selected ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="flex items-center gap-2 bg-muted p-1 rounded-md border border-border" role="group" aria-label="보기 방식">
      <button onClick={() => onWrapModeChange(false)} aria-pressed={!isWrapMode} className={buttonClass(!isWrapMode)}>
        가로 스크롤
      </button>
      <button onClick={() => onWrapModeChange(true)} aria-pressed={isWrapMode} className={buttonClass(isWrapMode)}>
        화면 맞춤
      </button>
    </div>
  );
}
