// 주요 일정 표시용 별. 색은 쓰는 쪽의 글자색(currentColor)을 따른다.
// 그림만으로는 화면 낭독기가 뜻을 모르므로, 쓰는 쪽에서 "주요" 같은 글자를 함께 붙인다.
const StarIcon = ({ className = 'w-2.5 h-2.5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
  </svg>
);

export default StarIcon;
