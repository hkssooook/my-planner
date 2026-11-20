import { beforeEach, describe, expect, it } from 'vitest';
import { isMigrationDone, markMigrationDone, mergePlanner, readLocalPlanner } from './migrateLocal';

const block = (id, start) => ({ id, start, end: '23:00', content: id, color: '#8DA5FD', is_important: false });

beforeEach(() => localStorage.clear());

describe('readLocalPlanner: 서랍 속 예전 일정', () => {
  it('아무것도 없으면 null', () => {
    expect(readLocalPlanner()).toBeNull();
  });

  it('일정과 카드 개수를 센다', () => {
    localStorage.setItem('planner_events', JSON.stringify([{ id: 1 }, { id: 2 }]));
    localStorage.setItem('planner_time_blocks', JSON.stringify({ '2026-01-05': [block('a', '09:00')], '2026-01-06': [block('b', '10:00'), block('c', '11:00')] }));
    expect(readLocalPlanner()).toMatchObject({ eventCount: 2, blockCount: 3 });
  });
});

describe('isMigrationDone · markMigrationDone: 이 브라우저는 이미 물어봤나', () => {
  it('한 번 고르면 다시 묻지 않는다', () => {
    expect(isMigrationDone()).toBe(false);
    markMigrationDone('skipped', 'u1');
    expect(isMigrationDone()).toBe(true);
    expect(JSON.parse(localStorage.getItem('planner_migration_done'))).toMatchObject({ how: 'skipped', userId: 'u1' });
  });
});

describe('mergePlanner: 계정 데이터에 서랍 데이터 합치기', () => {
  it('계정에 있는 것은 그대로 두고, 없는 것만 더한다 (같은 id는 한 번만)', () => {
    const remote = {
      events: [{ id: 1, title: '계정 일정' }],
      timeBlocks: { '2026-01-05': [block('a', '09:00')] },
    };
    const local = {
      events: [{ id: 1, title: '서랍의 같은 일정' }, { id: 2, title: '서랍 일정' }],
      timeBlocks: { '2026-01-05': [block('a', '09:00'), block('b', '08:00')], '2026-01-07': [block('c', '10:00')] },
    };
    const merged = mergePlanner(remote, local);
    expect(merged.events.map((e) => e.title)).toEqual(['계정 일정', '서랍 일정']);
    expect(merged.timeBlocks['2026-01-05'].map((b) => b.id)).toEqual(['b', 'a']); // 시작 시각 순서
    expect(merged.timeBlocks['2026-01-07'].map((b) => b.id)).toEqual(['c']);
  });

  it('계정이 비어 있으면 서랍 데이터 그대로', () => {
    const local = { events: [{ id: 1 }], timeBlocks: { '2026-01-05': [block('a', '09:00')] } };
    expect(mergePlanner({ events: [], timeBlocks: {} }, local)).toEqual({ events: local.events, timeBlocks: local.timeBlocks });
  });
});
