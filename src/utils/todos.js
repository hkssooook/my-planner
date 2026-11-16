// 시간 일정 카드의 할 일(투두) 목록을 다루는 도구 모음.
//
// 할 일은 카드 안에 목록으로 저장한다. (카드를 옮기거나 지우면 할 일도 함께 따라간다)
//   block.todos: [{ id, text: '자료 출력', done: false }]
// 예전에 만든 카드에는 todos가 없다. 없으면 빈 목록으로 본다. (todosOf)
//
// 모든 도구는 원래 목록을 고치지 않고 새 목록을 돌려준다. (React가 바뀐 것을 알아채게)

// 할 일마다 붙이는 고유번호. 같은 글자의 할 일이 여러 개여도 구분된다.
const makeTodoId = () => crypto.randomUUID();

// 카드의 할 일 목록 (없으면 빈 목록)
export const todosOf = (block) => (Array.isArray(block?.todos) ? block.todos : []);

// 맨 뒤에 할 일을 더한다. 앞뒤 빈칸은 잘라 내고, 비어 있으면 더하지 않는다.
export function addTodo(todos, text) {
  const trimmed = text.trim();
  if (!trimmed) return todos;
  return [...todos, { id: makeTodoId(), text: trimmed, done: false }];
}

// 완료 표시를 켜거나 끈다.
export const setTodoDone = (todos, id, done) => todos.map((todo) => (todo.id === id ? { ...todo, done } : todo));

// 글자를 고친다. 글자를 다 지우면 그 할 일을 없앤다. (빈 할 일은 남기지 않는다)
export function renameTodo(todos, id, text) {
  const trimmed = text.trim();
  if (!trimmed) return removeTodo(todos, id);
  return todos.map((todo) => (todo.id === id ? { ...todo, text: trimmed } : todo));
}

export const removeTodo = (todos, id) => todos.filter((todo) => todo.id !== id);

// 진행 상황: { done: 완료한 개수, total: 전체 개수 } — 화면에 "2/5"처럼 보여 줄 때 쓴다.
export const todoProgress = (todos) => ({ done: todos.filter((todo) => todo.done).length, total: todos.length });
