// 한국천문연구원 "특일 정보" API(공공데이터포털)의 응답을 우리 앱의 공휴일 모양으로 바꾸는 순수 함수들.
// 네트워크나 파일은 건드리지 않아서(= 시험하기 쉬워서) sync-holidays.mjs와 따로 두었다.
//
// 우리 앱의 모양:  { '2026-01-01': '신정', '2026-02-17': '설날', ... }
//
// 응답 모양 (JSON, _type=json): { response: { header: { resultCode, resultMsg }, body: { totalCount, items: { item } } } }
//   - 공휴일이 여러 개면 item은 배열, 1개면 객체, 0개면 items가 빈 문자열("")이다.
//   - 각 항목: { locdate: 20260217, dateName: '설날', isHoliday: 'Y', dateKind: '01', seq: 1 }
// ※ 이 모양은 공개된 사용 예시를 바탕으로 정리한 것이다. 인증키로 실제 응답을 받아 본 뒤 한 번 더 확인한다.

// 20260217 (숫자 또는 글자) → '2026-02-17'. 올바른 날짜가 아니면 null.
export const toIsoDate = (locdate) => {
  const text = String(locdate ?? '').trim();
  if (!/^\d{8}$/.test(text)) return null;
  const iso = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null; // 13월, 0일처럼 아예 날짜가 아닌 값
  return d.toISOString().slice(0, 10) === iso ? iso : null; // 2월 30일처럼 넘쳐서 다른 날로 바뀌는 값을 걸러 낸다
};

// 응답(JSON 객체) 하나에서 항목 배열을 꺼낸다. 0개 / 1개 / 여러 개를 모두 배열로 맞춘다.
const itemsOf = (json) => {
  const body = json?.response?.body;
  const items = body?.items;
  if (!items) return []; // "" 또는 없음 = 공휴일 없음
  const item = items.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
};

// 응답(JSON 객체) → { 'YYYY-MM-DD': '이름' }. 문제가 있으면 이유를 적은 오류를 던진다.
export const parseHolidayResponse = (json) => {
  const header = json?.response?.header;
  if (!header) throw new Error('응답에 response.header가 없습니다. (인증키 오류이거나 예상과 다른 응답입니다)');
  if (String(header.resultCode) !== '00') {
    throw new Error(`API가 오류를 알려 왔습니다: ${header.resultCode} ${header.resultMsg ?? ''}`.trim());
  }

  const result = {};
  for (const item of itemsOf(json)) {
    if (item.isHoliday === 'N') continue; // 쉬는 날이 아닌 기념일(예: 어버이날)은 제외
    const date = toIsoDate(item.locdate);
    if (!date) throw new Error(`날짜를 읽을 수 없는 항목이 있습니다: locdate=${JSON.stringify(item.locdate)}`);
    const name = String(item.dateName ?? '').trim();
    if (!name) throw new Error(`이름이 비어 있는 항목이 있습니다: ${date}`);
    // 같은 날이 두 번 나오면(예: 대체공휴일과 다른 휴일) 이름을 " · "로 합친다
    result[date] = result[date] && result[date] !== name ? `${result[date]} · ${name}` : name;
  }
  return result;
};

// 모든 날짜가 요청한 연도에 속하는지 확인한다. (엉뚱한 해의 데이터가 섞이는 것을 막는다)
export const assertYear = (holidays, year) => {
  for (const date of Object.keys(holidays)) {
    if (!date.startsWith(`${year}-`)) throw new Error(`${year}년을 요청했는데 ${date} 항목이 들어 있습니다.`);
  }
};

// 날짜 순서로 정렬한 새 객체 (파일로 저장할 때 항상 같은 순서가 되어, 바뀐 곳만 git에 보인다)
export const sortByDate = (holidays) => Object.fromEntries(Object.entries(holidays).sort(([a], [b]) => a.localeCompare(b)));

// JSON이 아닌 응답(공공데이터포털 관문이 XML이나 글자로 돌려주는 오류)을 알아듣기 쉬운 한국어로 바꾼다.
// 응답 원문에는 요청 주소(인증키 포함)가 들어갈 수 있어서, 원문을 그대로 보여 주지 않고 아는 오류만 설명한다.
export const explainNonJson = (text) => {
  const t = String(text ?? '');
  if (/SERVICE_KEY_IS_NOT_REGISTERED/i.test(t)) return '등록되지 않은 인증키입니다. 키를 잘못 복사했거나, 발급 직후라 아직 적용되지 않았을 수 있습니다. (발급 후 잠시 뒤 다시 시도)';
  if (/SERVICE ACCESS DENIED|ACCESS_DENIED|SERVICE_ACCESS_DENIED/i.test(t)) return '이 API를 쓸 권한이 없습니다. 공공데이터포털에서 "한국천문연구원_특일 정보"를 활용 신청했는지 확인하세요.';
  if (/LIMITED_NUMBER_OF_SERVICE_REQUESTS|REQUEST_LIMIT/i.test(t)) return '하루 호출 한도를 넘었습니다. 내일 다시 시도하세요.';
  if (/SERVICE_TIME_OUT|TEMPORARILY|UNKNOWN_ERROR/i.test(t)) return '공공데이터포털 서버의 일시적인 오류입니다. 잠시 뒤 다시 시도하세요.';
  if (/^\s*</.test(t)) return 'JSON이 아니라 XML(태그) 응답이 왔습니다. 인증키 문제일 가능성이 큽니다.';
  return 'JSON이 아닌 응답이 왔습니다.';
};

// 인증키를 요청에 쓸 수 있는 모양으로 맞춘다.
// 공공데이터포털은 "Encoding" 키(% 기호가 들어 있음)와 "Decoding" 키 두 가지를 주는데, 어느 쪽을 붙여 넣어도 되게 한다.
export const normalizeServiceKey = (key) => {
  const trimmed = String(key ?? '').trim();
  if (!trimmed) return '';
  return trimmed.includes('%') ? decodeURIComponent(trimmed) : trimmed;
};

// 요청 주소를 만든다. (연도 전체를 한 번에 받는다: numOfRows=365)
export const buildRequestUrl = (serviceKey, year) => {
  const url = new URL('https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo');
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('solYear', String(year));
  url.searchParams.set('numOfRows', '365');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('_type', 'json');
  return url;
};
