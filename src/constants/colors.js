// 일정 색 5가지. 값은 docs/design-tokens.md의 "4. 일정 색 5가지"와 같다. (시험이 문서와 같은지 확인한다)
// 일정은 색을 이 값으로 직접 저장하므로, 여기를 바꿔도 이미 만든 일정은 옛 색 그대로 보인다.
export const COLOR_PALETTE = [
  { name: '블루', value: '#8DA5FD' },
  { name: '퍼플', value: '#B493FC' },
  { name: '핑크', value: '#FD8AEB' },
  { name: '앰버', value: '#FDCA59' },
  { name: '민트', value: '#7AC4A4' },
];

// --- 화면 바탕 단계 색 ---
// 한 가지 색을 흰색(1단계)부터 그 색(5단계)까지 5단계로 나눈 것. 화면의 바탕·카드·칸·선택 표시 등을 이 단계 중에서 고른다.
// 값은 docs/design-tokens.md의 "6. 바탕 단계 색" 표, src/index.css의 --surface-<색>-1~5와 같다. (시험이 셋이 같은지 확인한다)
//
// 다른 색을 추가할 때는 BACKGROUND_SCALES에 한 줄만 더한다. 예: green: makeBackgroundScale('#FFFFFF', '#2FA36B')
// 그다음 문서 표와 index.css에 같은 값을 적는다.

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

// from(1단계) → to(5단계)를 같은 간격으로 5단계 나눈다. (빨강·초록·파랑 값을 각각 0%, 25%, 50%, 75%, 100% 섞음)
export function makeBackgroundScale(from, to, steps = 5) {
  const [a, b] = [toRgb(from), toRgb(to)];
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return toHex(a.map((v, c) => Math.round(v + (b[c] - v) * t)));
  });
}

export const BACKGROUND_SCALES = {
  // 파랑: 1단계 #FFFFFF(날짜 칸·카드) → 5단계 #6D72FD(화면 기본 바탕)
  blue: makeBackgroundScale('#FFFFFF', '#6D72FD'),
};
