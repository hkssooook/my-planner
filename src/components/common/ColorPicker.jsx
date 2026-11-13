import { COLOR_PALETTE } from '../../constants/colors';

// 크기별 모양. Tailwind는 완성된 클래스 이름이 코드에 그대로 있어야 인식하므로
// `w-${n}` 처럼 조립하지 않고 옵션별로 통째로 적는다.
const SIZES = {
  lg: {
    wrapper: 'flex gap-2.5',
    base: 'w-7 h-7 rounded-full border-2',
    selected: 'border-gray-900 shadow-md ring-2 ring-offset-1 ring-gray-900',
    unselected: 'border-transparent',
    showName: false,
  },
  md: {
    wrapper: 'flex gap-1.5 flex-shrink-0',
    base: 'w-6 h-6 rounded-full border-2',
    selected: 'border-gray-900 ring-1 ring-offset-1 ring-gray-900',
    unselected: 'border-transparent',
    showName: false,
  },
  sm: {
    wrapper: 'flex gap-1 items-center px-1 flex-shrink-0',
    base: 'w-3.5 h-3.5 rounded-full border border-gray-200',
    selected: 'ring-1 ring-offset-1 ring-gray-900',
    unselected: '',
    showName: true,
  },
};

export default function ColorPicker({ value, onChange, size = 'lg' }) {
  const s = SIZES[size];

  return (
    <div className={s.wrapper}>
      {COLOR_PALETTE.map(color => (
        <button
          key={color.value}
          onClick={() => onChange(color.value)}
          style={{ backgroundColor: color.value }}
          className={`${s.base} ${value === color.value ? s.selected : s.unselected}`}
          title={s.showName ? color.name : undefined}
        />
      ))}
    </div>
  );
}
