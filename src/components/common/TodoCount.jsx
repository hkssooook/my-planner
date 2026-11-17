// 할 일 진행 숫자 "3 / 7" (리디자인 기획서: 진척도는 막대 없이 숫자로).
// 끝낸 개수는 굵은 파랑(primary), "/ 전체"는 작고 흐린 글자. 어디서나 이 모양 하나만 쓴다.
//   done, total  끝낸 개수, 전체 개수
//   className    놓는 자리에 맞춘 여백·크기 등 (예: 'ml-auto')
//   label        화면 낭독기가 읽을 말. 숫자만으로는 뜻을 알기 어려워서 "7개 중 3개 완료"처럼 읽힌다
export default function TodoCount({ done, total, className = '', ...rest }) {
  return (
    <span
      aria-label={`${total}개 중 ${done}개 완료`}
      className={`inline-flex items-baseline whitespace-pre ${className}`}
      {...rest}
    >
      <span className="font-bold text-primary">{done}</span>{' '}
      <span className="text-[0.85em] font-normal text-muted-foreground">/ {total}</span>
    </span>
  );
}
