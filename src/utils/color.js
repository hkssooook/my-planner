// 일정 색 위에 올릴 글자색을 정한다.
// 일정 색은 값(#RRGGBB)으로 직접 저장되어서, 지금 5가지 파스텔뿐 아니라 예전에 만든 진한 색(파랑·빨강 등)도 있다.
// 그래서 색마다 "진한 글자"와 "흰 글자" 중 대비가 더 큰 쪽을 고른다. (WCAG 대비 계산)

export const DARK_TEXT = '#21242E'; // docs/design-tokens.md의 foreground
export const LIGHT_TEXT = '#FFFFFF';

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

// 이 배경색 위에서 더 잘 읽히는 글자색
export const readableTextOn = (background) =>
  contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
