import { buildRequestUrl, parseHolidayResponse, assertYear, sortByDate, explainNonJson } from './holidays-parse.mjs';

// 한 해의 공휴일을 API에서 받아 { 'YYYY-MM-DD': '이름' }으로 돌려준다.
// fetchImpl은 시험에서 가짜 응답을 끼워 넣으려고 바꿀 수 있게 열어 둔 자리다.
//
// 보안: 요청 주소에는 인증키가 들어 있다. 그래서 오류 메시지에 주소나 응답 원문을 절대 넣지 않는다.
export const fetchYearHolidays = async (serviceKey, year, fetchImpl = fetch) => {
  const url = buildRequestUrl(serviceKey, year);

  let response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    // error.message에는 주소(인증키 포함)가 들어갈 수 있어서 종류(name)만 보여 주고, 원인(cause)도 일부러 붙이지 않는다
    // eslint-disable-next-line preserve-caught-error
    throw new Error(`${year}년 요청에 실패했습니다 (${error?.name ?? '알 수 없는 오류'}). 인터넷 연결을 확인하세요.`);
  }

  const text = await response.text();
  if (!response.ok) {
    const hint = explainNonJson(text);
    throw new Error(`${year}년: 서버가 ${response.status} 오류를 돌려줬습니다. ${hint}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    // 원인 오류에는 응답 원문이 들어 있을 수 있어서 일부러 붙이지 않는다 (오류 객체를 받지 않는 catch)
    throw new Error(`${year}년: ${explainNonJson(text)}`);
  }

  let holidays;
  try {
    holidays = parseHolidayResponse(json);
  } catch (error) {
    throw new Error(`${year}년: ${error.message}`, { cause: error }); // 이 오류는 우리가 만든 것이라 인증키가 들어 있지 않다
  }
  assertYear(holidays, year);
  return sortByDate(holidays);
};
