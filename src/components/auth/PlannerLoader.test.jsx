import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlannerLoader from './PlannerLoader';
import { fakeTableClient } from '@/test/fakeSupabase';

const show = ({ initialData }) => <p>일정 {initialData.events.length}개</p>;

beforeEach(() => localStorage.clear());

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

  describe('서랍 속 예전 일정 옮기기', () => {
    const seedLocal = () => {
      localStorage.setItem('planner_events', JSON.stringify([{ id: 2, title: '서랍 일정' }]));
      localStorage.setItem('planner_time_blocks', JSON.stringify({ '2026-01-05': [{ id: 'a', start: '09:00', end: '10:00' }] }));
    };
    const accountRow = { events: [{ id: 1, title: '계정 일정' }], time_blocks: {} };

    it('[옮기기]: 계정 일정과 합쳐 수파베이스에 쓰고, 다시 묻지 않는다. 서랍은 그대로', async () => {
      seedLocal();
      const user = userEvent.setup();
      const client = fakeTableClient({ row: accountRow });
      render(<PlannerLoader userId="u1" client={client}>{show}</PlannerLoader>);

      const dialog = await screen.findByRole('dialog', { name: '예전 일정 옮기기' });
      expect(dialog).toHaveTextContent('예전 일정 1개와 시간 카드 1개');
      await user.click(screen.getByRole('button', { name: '옮기기' }));

      expect(await screen.findByText('일정 2개')).toBeInTheDocument();
      expect(client.upsert.mock.calls[0][0]).toMatchObject({
        user_id: 'u1',
        events: [{ id: 1, title: '계정 일정' }, { id: 2, title: '서랍 일정' }],
        time_blocks: { '2026-01-05': [{ id: 'a', start: '09:00', end: '10:00' }] },
      });
      expect(JSON.parse(localStorage.getItem('planner_migration_done'))).toMatchObject({ how: 'migrated', userId: 'u1' });
      expect(JSON.parse(localStorage.getItem('planner_events'))).toHaveLength(1); // 서랍은 백업으로 남는다
    });

    it('[건너뛰기]: 옮기지 않고 계정 일정만 보이며, 다시 묻지 않는다', async () => {
      seedLocal();
      const user = userEvent.setup();
      const client = fakeTableClient({ row: accountRow });
      const { unmount } = render(<PlannerLoader userId="u1" client={client}>{show}</PlannerLoader>);

      await user.click(await screen.findByRole('button', { name: '건너뛰기' }));
      expect(await screen.findByText('일정 1개')).toBeInTheDocument();
      expect(client.upsert).not.toHaveBeenCalled();
      unmount();

      render(<PlannerLoader userId="u2" client={client}>{show}</PlannerLoader>);
      expect(await screen.findByText('일정 1개')).toBeInTheDocument(); // 다른 계정으로 와도 묻지 않는다
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('옮기지 못하면 알려 주고, 다시 누를 수 있다', async () => {
      seedLocal();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      const client = fakeTableClient({ row: accountRow });
      client.upsert.mockResolvedValueOnce({ error: { message: 'offline' } });
      render(<PlannerLoader userId="u1" client={client}>{show}</PlannerLoader>);

      await user.click(await screen.findByRole('button', { name: '옮기기' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('옮기지 못했어요');
      expect(localStorage.getItem('planner_migration_done')).toBeNull();

      await user.click(screen.getByRole('button', { name: '옮기기' }));
      expect(await screen.findByText('일정 2개')).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it('서랍이 비어 있으면 묻지 않는다', async () => {
      render(<PlannerLoader userId="u1" client={fakeTableClient({ row: accountRow })}>{show}</PlannerLoader>);
      expect(await screen.findByText('일정 1개')).toBeInTheDocument();
    });
  });
});
