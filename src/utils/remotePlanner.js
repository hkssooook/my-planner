// 수파베이스의 planner_data 표에서 "내 줄"을 읽고 쓰는 곳. (표 모양은 supabase/schema.sql 참고)
// 한 사람 = 한 줄: { user_id, events, time_blocks, updated_at }
// 앱 안에서는 timeBlocks(낙타 모양 이름), 표에서는 time_blocks(밑줄 이름)라서 여기서 서로 바꿔 준다.

const TABLE = 'planner_data';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

// 내 줄을 읽는다.
//   돌려주는 값: { events, timeBlocks, isNew }
//   isNew  아직 줄이 없다 (처음 로그인했거나 한 번도 저장하지 않았다)
// 값이 기대한 모양(목록 / 일반 객체)이 아니면 빈 값으로 바꿔서, 엉뚱한 데이터 때문에 앱이 멈추지 않게 한다.
// 읽지 못하면(인터넷 끊김 등) 오류를 던진다. 부르는 쪽이 "다시 시도"를 보여 준다.
export async function loadRemotePlanner(client, userId) {
  const { data, error } = await client
    .from(TABLE)
    .select('events, time_blocks')
    .eq('user_id', userId)
    .maybeSingle(); // 줄이 없으면 오류 대신 null
  if (error) throw error;
  return {
    events: Array.isArray(data?.events) ? data.events : [],
    timeBlocks: isPlainObject(data?.time_blocks) ? data.time_blocks : {},
    isNew: !data,
  };
}

// 내 줄에 저장한다. changes에 넣은 것만 바꾸고 나머지 칸은 그대로 둔다.
//   예: saveRemotePlanner(client, userId, { events })               기간 일정만
//       saveRemotePlanner(client, userId, { events, timeBlocks })   둘 다
// 줄이 없으면 새로 만들고, 있으면 고친다 (upsert = update + insert).
// 저장하지 못하면 오류를 던진다.
export async function saveRemotePlanner(client, userId, changes) {
  const row = { user_id: userId, updated_at: new Date().toISOString() };
  if ('events' in changes) row.events = changes.events;
  if ('timeBlocks' in changes) row.time_blocks = changes.timeBlocks;
  const { error } = await client.from(TABLE).upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}
