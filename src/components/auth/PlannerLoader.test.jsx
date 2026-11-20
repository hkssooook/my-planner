import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlannerLoader from './PlannerLoader';
import { fakeTableClient } from '@/test/fakeSupabase';

const show = ({ initialData }) => <p>일정 {initialData.events.length}개</p>;

describe('PlannerLoader: 로그인한 사람의 일정 불러오기', () => {
  it('불러오는 동안 안내를 보이고, 다 가져오면 화면을 그린다', async () => {
    const client = fakeTableClient({ row: { events: [{ id: 1 }, { id: 2 }], time_blocks: {} } });
    render(<PlannerLoader userId="u1" client={client}>{show}</PlannerLoader>);
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
    expect(await screen.findByText('일정 2개')).toBeInTheDocument();
  });

  it('persist는 그 사람 줄에 쓴다', async () => {
    const client = fakeTableClient();
    let store;
    render(<PlannerLoader userId="u1" client={client}>{(s) => { store = s; return <p>준비됨</p>; }}</PlannerLoader>);
    await screen.findByText('준비됨');
    await store.persist({ events: [] });
    expect(client.upsert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', events: [] });
  });

  it('불러오지 못하면 [다시 시도]로 다시 가져온다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const client = fakeTableClient();
    client.query.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
      .mockResolvedValueOnce({ data: { events: [{ id: 1 }], time_blocks: {} }, error: null });
    render(<PlannerLoader userId="u1" client={client}>{show}</PlannerLoader>);

    await user.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('일정 1개')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
