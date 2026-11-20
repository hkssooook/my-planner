import { vi } from 'vitest';

// 진짜 수파베이스 대신 쓰는 가짜 (시험 전용). client.from('표').select().eq().maybeSingle() / .upsert() 모양만 흉내 낸다.
//   row     읽을 때 돌려줄 줄 (null이면 줄 없음)
//   error   읽거나 쓸 때 돌려줄 오류
export function fakeTableClient({ row = null, error = null } = {}) {
  const upsert = vi.fn(async () => ({ error }));
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: error ? null : row, error })),
    upsert,
  };
  return { from: vi.fn(() => query), query, upsert };
}
