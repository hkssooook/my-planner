import { describe, it, expect } from 'vitest';
import { todosOf, addTodo, setTodoDone, renameTodo, removeTodo, todoProgress } from './todos';

const list = [
  { id: 'a', text: '자료 출력', done: false },
  { id: 'b', text: '회의실 예약', done: true },
];

describe('todosOf (카드의 할 일 목록)', () => {
  it('할 일이 있으면 그 목록, 없거나 모양이 이상하면 빈 목록 (예전에 만든 카드)', () => {
    expect(todosOf({ todos: list })).toBe(list);
    expect(todosOf({ id: 'x' })).toEqual([]);
    expect(todosOf({ todos: '깨진 값' })).toEqual([]);
    expect(todosOf(undefined)).toEqual([]);
  });
});

describe('addTodo (할 일 더하기)', () => {
  it('맨 뒤에 미완료 상태로 더하고, 앞뒤 빈칸은 잘라 낸다', () => {
    const next = addTodo(list, '  발표 준비  ');
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({ id: expect.any(String), text: '발표 준비', done: false });
    expect(list).toHaveLength(2); // 원래 목록은 그대로
  });

  it('빈 글자(빈칸만 있는 것 포함)는 더하지 않는다', () => {
    expect(addTodo(list, '')).toBe(list);
    expect(addTodo(list, '   ')).toBe(list);
  });

  it('같은 글자를 두 번 더해도 서로 다른 할 일이다 (id가 다르다)', () => {
    const next = addTodo(addTodo([], '전화'), '전화');
    expect(next[0].id).not.toBe(next[1].id);
  });
});

describe('setTodoDone · renameTodo · removeTodo', () => {
  it('setTodoDone: 그 할 일만 완료를 켜거나 끈다', () => {
    expect(setTodoDone(list, 'a', true).map((t) => t.done)).toEqual([true, true]);
    expect(setTodoDone(list, 'b', false).map((t) => t.done)).toEqual([false, false]);
  });

  it('renameTodo: 글자를 고치고(빈칸 잘라 냄), 완료 상태는 그대로 둔다', () => {
    expect(renameTodo(list, 'b', ' 큰 회의실 예약 ')[1]).toEqual({ id: 'b', text: '큰 회의실 예약', done: true });
  });

  it('renameTodo: 글자를 다 지우면 그 할 일이 사라진다', () => {
    expect(renameTodo(list, 'a', '  ').map((t) => t.id)).toEqual(['b']);
  });

  it('removeTodo: 그 할 일만 지운다', () => {
    expect(removeTodo(list, 'a').map((t) => t.id)).toEqual(['b']);
  });
});

describe('todoProgress (진행 상황)', () => {
  it('완료한 개수와 전체 개수를 센다', () => {
    expect(todoProgress(list)).toEqual({ done: 1, total: 2 });
    expect(todoProgress([])).toEqual({ done: 0, total: 0 });
  });
});
