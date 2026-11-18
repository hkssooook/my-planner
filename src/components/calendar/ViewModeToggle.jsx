import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 연간 달력의 보기 방식 탭(shadcn Tabs 기본형): 가로 스크롤(한 달을 한 줄로) / 화면 맞춤(화면 폭에 맞춰 줄바꿈).
// 화면 전체가 아니라 달력에만 쓰이는 설정이라, 머리말이 아니라 달력 상자 바로 위에 둔다.
// 선택된 값은 App이 들고 있고(TopBar를 거쳐 받는다), 이 부품은 보여 주고 "바뀌었다"고 알리기만 한다.
export default function ViewModeToggle({ isWrapMode, onWrapModeChange }) {
  return (
    <Tabs value={isWrapMode ? 'wrap' : 'scroll'} onValueChange={(value) => onWrapModeChange(value === 'wrap')}>
      {/* 탭 묶음 바탕은 헤더 카드와 같은 파랑 2단계, 선택한 탭은 흰색이다 */}
      <TabsList aria-label="보기 방식" className="bg-surface-blue-2">
        <TabsTrigger value="scroll">가로 스크롤</TabsTrigger>
        <TabsTrigger value="wrap">화면 맞춤</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
