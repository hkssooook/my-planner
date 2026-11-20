import { describe, expect, it } from 'vitest';
import { loadRemotePlanner, saveRemotePlanner } from './remotePlanner';
import { fakeTableClient } from '../test/fakeSupabase';

describe('loadRemotePlanner: 내 줄 읽기', () => {
  it('내 줄의 일정과 카드를 앱 모양(timeBlocks)으로 돌려준다', async () => {
    const events = [{ id: 1, title: '여름휴가' }];
    const timeBlocks = { '2026-01-05': [{ id: 2, start: '09:00', end: '10:00' }] };
    const client = fakeTableClient({ row: { events, time_blocks: timeBlocks } });

    await expect(loadRemotePlanner(client, 'u1')).resolves.toEqual({ events, timeBlocks, isNew: false });
    expect(client.from).toHaveBeenCalledWith('planner_data');
    expect(client.query.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('줄이 없으면 빈 값과 isNew', async () => {
    await expect(loadRemotePlanner(fakeTableClient(), 'u1')).resolves.toEqual({ events: [], timeBlocks: {}, isNew: true });
  });

  it('모양이 이상한 값은 빈 값으로 바꾼다', async () => {
    const client = fakeTableClient({ row: { events: { a: 1 }, time_blocks: [1, 2] } });
    await expect(loadRemotePlanner(client, 'u1')).resolves.toEqual({ events: [], timeBlocks: {}, isNew: false });
  });

  it('읽지 못하면 오류를 던진다', async () => {
    await expect(loadRemotePlanner(fakeTableClient({ error: { message: 'boom' } }), 'u1')).rejects.toEqual({ message: 'boom' });
  });
});

describe('saveRemotePlanner: 내 줄에 쓰기', () => {
  it('넘긴 칸만 표 이름(time_blocks)으로 바꿔 쓴다', async () => {
    const client = fakeTableClient();
    await saveRemotePlanner(client, 'u1', { events: [] });
    const [row, options] = client.upsert.mock.calls[0];
    expect(row).toMatchObject({ user_id: 'u1', events: [] });
    expect(row).not.toHaveProperty('time_blocks');
    expect(options).toEqual({ onConflict: 'user_id' });

    await saveRemotePlanner(client, 'u1', { events: [], timeBlocks: { a: [] } });
    expect(client.upsert.mock.calls[1][0]).toMatchObject({ events: [], time_blocks: { a: [] } });
  });

  it('쓰지 못하면 오류를 던진다', async () => {
    await expect(saveRemotePlanner(fakeTableClient({ error: { message: 'down' } }), 'u1', { events: [] })).rejects.toEqual({ message: 'down' });
  });
});
