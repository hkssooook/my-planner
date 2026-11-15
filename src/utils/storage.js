// 브라우저 저장소(localStorage)를 읽고 쓰는 곳을 한 군데로 모은 파일.
// 나중에 저장 위치를 서버 등으로 바꾸게 되면 이 파일만 고치면 된다.

export const STORAGE_KEYS = {
  events: 'planner_events',
  daily: 'planner_daily', // 옛 모양(시간 칸). 새 모양으로 옮긴 뒤에도 백업으로 남겨 둔다.
  timeBlocks: 'planner_time_blocks', // 새 모양(시작~끝 카드)
};

// 저장된 값을 읽는다. 저장된 게 없거나 내용이 깨져 있으면 fallback을 돌려줘서 앱이 멈추지 않게 한다.
export function loadJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`저장된 데이터(${key})를 읽지 못했습니다.`, error);
    return fallback;
  }
}

// 값을 저장한다. 저장 공간이 부족하거나 막혀 있어도 앱이 멈추지 않고, 성공 여부(true/false)를 돌려준다.
export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`데이터(${key})를 저장하지 못했습니다.`, error);
    return false;
  }
}
