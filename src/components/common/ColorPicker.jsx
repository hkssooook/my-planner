import { COLOR_PALETTE } from '../../constants/colors';

// 크기별 모양. Tailwind는 완성된 클래스 이름이 코드에 그대로 있어야 인식하므로
// `w-${n}` 처럼 조립하지 않고 옵션별로 통째로 적는다.
const SIZES = {
  lg: {
    wrapper: 'flex gap-2.5',
    base: 'w-7 h-7 rounded-full border-2',
    selected: 'border-foreground shadow-md ring-2 ring-offset-1 ring-foreground',
    unselected: 'border-transparent',
    showName: false,
  },
  md: {
    wrapper: 'flex gap-1.5 shrink-0',
    base: 'w-6 h-6 rounded-full border-2',
    selected: 'border-foreground ring-1 ring-offset-1 ring-foreground',
    unselected: 'border-transparent',
    showName: false,
  },
  sm: {
    wrapper: 'flex gap-1 items-center px-1 shrink-0',
    base: 'w-3.5 h-3.5 rounded-full border border-border',
    selected: 'ring-1 ring-offset-1 ring-foreground',
    unselected: '',
    showName: true,
  },
};

// 색 동그라미 버튼 묶음. 각 버튼의 이름은 색 이름(블루 등)이고, 지금 고른 색은 눌림(aria-pressed) 상태로 알려진다.
//   label  이 묶음의 이름. 한 화면에 선택기가 여러 개일 때(시간대마다 하나씩) 구분하려고 쓴다.
export default function ColorPicker({ value, onChange, size = 'lg', label = '일정 색' }) {
  const s = SIZES[size];

  return (
    <div className={s.wrapper} role="group" aria-label={label}>
      {COLOR_PALETTE.map(color => (
        <button
          key={color.value}
          type="button" // 입력 양식(form) 안에 있어도 색만 고르고 양식을 제출하지 않게
          onClick={() => onChange(color.value)}
          aria-label={color.name}
          aria-pressed={value === color.value}
          style={{ backgroundColor: color.value }}
          className={`${s.base} ${value === color.value ? s.selected : s.unselected}`}
          title={s.showName ? color.name : undefined}
        />
      ))}
    </div>
  );
}
