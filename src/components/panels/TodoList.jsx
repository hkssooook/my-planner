import { useState } from 'react';
import DeleteIcon from '../icons/DeleteIcon';
import TodoCount from '../common/TodoCount';
import { addTodo, removeTodo, renameTodo, setTodoDone, todoProgress } from '../../utils/todos';

// 카드 상세 패널의 "할 일" 칸.
//   - 맨 아래 입력칸에 쓰고 Enter → 할 일이 더해지고, 커서가 그대로 남아 바로 다음 할 일을 쓸 수 있다.
//   - 체크박스로 완료 표시. 완료한 할 일은 그 자리에서 줄이 그어지고 흐려진다. (순서는 바뀌지 않는다)
//   - 글자를 누르면 고치는 칸으로 바뀐다. Enter나 다른 곳을 누르면 저장, Esc는 취소. 글자를 다 지우면 그 할 일이 사라진다.
//   - ✕로 지운다.
//
//   todos             이 카드의 할 일 목록 [{ id, text, done }]
//   onChange(change)  "지금 목록 → 새 목록" 함수를 넘긴다. 저장은 부모가 한다. (예: onChange((t) => addTodo(t, '전화')))
export default function TodoList({ todos, onChange }) {
  const [draft, setDraft] = useState(''); // 새 할 일 입력칸
  const [editing, setEditing] = useState(null); // 고치는 중인 할 일 { id, text }. 아니면 null

  const { done, total } = todoProgress(todos);

  const submitDraft = () => {
    if (!draft.trim()) return;
    const text = draft;
    onChange((list) => addTodo(list, text));
    setDraft('');
  };

  const finishEditing = () => {
    if (!editing) return;
    const { id, text } = editing;
    onChange((list) => renameTodo(list, id, text));
    setEditing(null);
  };

  return (
    <section aria-labelledby="block-todos" className="flex flex-col gap-1.5">
      {/* 제목 줄: 왼쪽 "할 일", 오른쪽 끝 진행 숫자 "1 / 4" */}
      <h3 id="block-todos" className="flex items-baseline text-sm font-semibold text-foreground">
        할 일
        {total > 0 && <TodoCount done={done} total={total} className="ml-auto text-sm" />}
      </h3>

      {total > 0 && (
        <ul className="flex flex-col">
          {todos.map((todo) => (
            <li key={todo.id} className="group/todo flex items-start gap-2 py-1 rounded-sm hover:bg-muted px-1 -mx-1">
              <input
                type="checkbox" checked={todo.done}
                aria-label={`${todo.text} 완료`}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange((list) => setTodoDone(list, todo.id, checked));
                }}
                className="mt-0.5 w-4 h-4 shrink-0 rounded-sm border-input cursor-pointer"
              />
              {editing?.id === todo.id ? (
                <input
                  type="text" autoFocus
                  aria-label="할 일 고치기"
                  value={editing.text}
                  onChange={(e) => setEditing({ id: todo.id, text: e.target.value })}
                  onBlur={finishEditing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); finishEditing(); }
                    if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); } // 고치기만 취소 (패널은 닫지 않는다)
                  }}
                  className="flex-1 min-w-0 px-1.5 py-0.5 -my-0.5 border border-input rounded-sm text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                />
              ) : (
                <button
                  type="button"
                  aria-label={`${todo.text} 고치기`}
                  onClick={() => setEditing({ id: todo.id, text: todo.text })}
                  className={`flex-1 min-w-0 text-left text-sm break-words cursor-text ${todo.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                >
                  {todo.text}
                </button>
              )}
              <button
                type="button"
                aria-label={`${todo.text} 삭제`}
                onClick={() => onChange((list) => removeTodo(list, todo.id))}
                className="mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover/todo:opacity-100 focus-visible:opacity-100 hover:text-destructive"
              >
                <DeleteIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 한글 입력 중(글자를 조합하는 중)에 누른 Enter는 무시한다. 안 그러면 마지막 글자가 한 번 더 들어간 할 일이 생긴다 */}
      <input
        type="text" placeholder="할 일 추가 (Enter)"
        aria-label="새 할 일"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submitDraft(); }
        }}
        className="px-3 py-1.5 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
      />
    </section>
  );
}
