// 일정 색으로 화면에 그릴 색들을 정한다. (WCAG 대비 계산)
// 일정 색은 값(#RRGGBB)으로 직접 저장되어서, 지금 5가지 파스텔뿐 아니라 예전에 만든 진한 색(파랑·빨강 등)도 있다.
// 그래서 정해진 표가 아니라 색마다 계산해서, 어떤 색이든 같은 모양으로 읽히게 한다.

// #RRGGBB의 "상대 휘도" (0 = 검정, 1 = 흰색)
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

// 두 색의 대비 비율 (1 ~ 21)
export const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
// 두 색을 섞는다. amount = 0이면 color 그대로, 1이면 target 그대로
const mix = (color, target, amount) => {
  const [a, b] = [toRgb(color), toRgb(target)];
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
};

export const TINT_AMOUNT = 0.72; // 연한 바탕: 일정 색에 흰색을 72% 섞는다
export const TEXT_MIN_CONTRAST = 7; // 짙은 글자는 연한 바탕과 대비 7:1 이상 (작은 글자도 편하게)

// 일정 막대·카드를 그리는 색 두 가지 (docs/design-tokens.md "4. 일정 색" 참고)
//   background  일정 색을 아주 연하게 한 바탕
//   text        같은 색 계열의 짙은 글자. 검정을 62%부터 섞고, 바탕과 대비가 7:1이 될 때까지 더 짙게 한다.
export function eventColors(color) {
  const background = mix(color, '#FFFFFF', TINT_AMOUNT);
  let amount = 0.62;
  let text = mix(color, '#000000', amount);
  while (contrastRatio(background, text) < TEXT_MIN_CONTRAST && amount < 0.95) {
    amount += 0.03;
    text = mix(color, '#000000', amount);
  }
  return { background, text };
}
