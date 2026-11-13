import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (클래스 이름 합치기)', () => {
  it('여러 클래스를 하나의 문자열로 합친다', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('거짓 값(false, null, undefined, 빈 문자열)은 건너뛴다', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('조건 객체는 참인 것만 넣는다', () => {
    expect(cn({ 'bg-white': true, 'bg-black': false }, 'p-2')).toBe('bg-white p-2');
  });

  it('배열도 펼쳐서 합친다', () => {
    expect(cn(['a', ['b']], 'c')).toBe('a b c');
  });

  it('충돌하는 Tailwind 클래스는 뒤에 온 것이 이긴다', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    expect(cn('h-8', 'h-10')).toBe('h-10');
  });

  it('충돌하지 않는 클래스는 모두 유지한다', () => {
    expect(cn('p-4', 'text-sm', 'font-medium')).toBe('p-4 text-sm font-medium');
  });

  it('넓은 클래스 뒤의 좁은 클래스는 함께 남는다 (p-4 뒤에 px-2)', () => {
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2');
  });

  it('인자가 없으면 빈 문자열이다', () => {
    expect(cn()).toBe('');
  });
});
