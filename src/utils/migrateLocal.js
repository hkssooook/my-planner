// 브라우저 서랍(localStorage)에 있던 예전 일정을 로그인한 계정(수파베이스)으로 옮길 때 쓰는 도구.
// 서랍 속 데이터는 지우지 않는다. 문제가 생겼을 때 되돌릴 수 있는 백업이 된다.
import { loadSavedEvents, loadSavedTimeBlocks } from '../hooks/usePlannerData';
import { sortBlocks } from './timeBlocks';

// "이 브라우저는 이미 물어봤다" 표시. 옮겼든 건너뛰었든 한 번 고르면 다시 묻지 않는다.
// 그래서 같은 브라우저에서 다른 계정으로 로그인해도 서랍 속 일정이 그 계정에 섞여 들어가지 않는다.
const DONE_KEY = 'planner_migration_done';

export function isMigrationDone() {
  try {
    return localStorage.getItem(DONE_KEY) !== null;
  } catch {
    return true; // 서랍을 못 열면 옮길 것도 없다
  }
}

// how: 'migrated' 옮김 | 'skipped' 건너뜀. 언제 무엇을 했는지 남겨 둔다
export function markMigrationDone(how, userId) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify({ how, userId, at: new Date().toISOString() }));
  } catch {
    // 표시를 못 남기면 다음에 또 묻는다. 합칠 때 같은 일정은 두 번 들어가지 않으니 괜찮다
  }
}

// 서랍 속 예전 일정. 옮길 것이 없으면 null
//   { events, timeBlocks, eventCount, blockCount }
export function readLocalPlanner() {
  const events = loadSavedEvents();
  const timeBlocks = loadSavedTimeBlocks();
  const eventCount = events.length;
  const blockCount = Object.values(timeBlocks).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  if (eventCount === 0 && blockCount === 0) return null;
  return { events, timeBlocks, eventCount, blockCount };
}

// 계정 데이터(remote)에 서랍 데이터(local)를 합친다. 계정에 이미 있는 것은 그대로 두고, 없는 것만 더한다.
// 같은 일정인지는 id로 본다. (일정 id는 만든 순간의 시각, 카드 id는 무작위라서 서로 겹치지 않는다)
export function mergePlanner(remote, local) {
  const eventIds = new Set(remote.events.map((evt) => evt.id));
  const events = [...remote.events, ...local.events.filter((evt) => !eventIds.has(evt.id))];

  const timeBlocks = { ...remote.timeBlocks };
  for (const [date, localList] of Object.entries(local.timeBlocks)) {
    if (!Array.isArray(localList) || localList.length === 0) continue;
    const remoteList = Array.isArray(timeBlocks[date]) ? timeBlocks[date] : [];
    const blockIds = new Set(remoteList.map((block) => block.id));
    const added = localList.filter((block) => !blockIds.has(block.id));
    if (added.length > 0) timeBlocks[date] = sortBlocks([...remoteList, ...added]);
  }
  return { events, timeBlocks };
}
