import { Button } from '@/components/ui/button';

// 패널 맨 아래 저장 줄 (리디자인 기획서 "저장 규칙": 저장 버튼을 눌러야만 저장).
// 일정 패널과 두 번째 패널(카드 상세·기간 일정)에 똑같이 붙는다. 어느 패널의 줄을 눌러도 같은 일을 한다.
//   고친 것이 있으면: "저장 안 한 변경 n개" + [되돌리기] [저장]
//   없으면: "모두 저장됨" + [저장됨](누를 수 없음)
//
//   changeCount  저장 안 한 변경 개수
//   onSave, onRevert
export default function SaveBar({ changeCount = 0, onSave, onRevert }) {
  return (
    // mt-auto: 패널 내용이 짧아도 늘 맨 아래에 붙는다 (두 패널의 저장 줄 높이가 맞는다)
    <div data-testid="save-bar" className="sticky bottom-0 z-10 mt-auto shrink-0 flex items-center gap-2 border-t border-border bg-card px-4 py-3">
      {changeCount > 0 ? (
        <>
          <span className="flex-1 flex items-center gap-1.5 text-xs text-foreground">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />
            저장 안 한 변경 {changeCount}개
          </span>
          <Button variant="secondary" onClick={onRevert}>되돌리기</Button>
          <Button onClick={onSave}>저장</Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-xs text-muted-foreground">모두 저장됨</span>
          <Button variant="secondary" disabled>저장됨</Button>
        </>
      )}
    </div>
  );
}
