import { describe, it, expect } from 'vitest';
import {
  toIsoDate, parseHolidayResponse, assertYear, sortByDate, explainNonJson, normalizeServiceKey, buildRequestUrl,
} from './holidays-parse.mjs';

// 공개된 사용 예시를 바탕으로 만든 가짜 응답 (실제 응답으로 한 번 더 확인할 것: docs/holiday-data.md)
const ok = (items, totalCount) => ({
  response: { header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' }, body: { items, totalCount, numOfRows: 365, pageNo: 1 } },
});
const item = (locdate, dateName, extra = {}) => ({ dateKind: '01', dateName, isHoliday: 'Y', locdate, seq: 1, ...extra });

describe('toIsoDate', () => {
  it('숫자 20260217도, 글자 "20260217"도 2026-02-17이 된다', () => {
    expect(toIsoDate(20260217)).toBe('2026-02-17');
    expect(toIsoDate('20260217')).toBe('2026-02-17');
  });

  it.each([[null], [undefined], [''], ['2026-02-17'], [2026021], [202602170], ['abcdefgh'], [20260230], [20261301], [20260100]])(
    '올바르지 않은 값 %s 은 null이다 (없는 날짜도 걸러 낸다)',
    (value) => expect(toIsoDate(value)).toBeNull(),
  );

  it('윤년의 2월 29일은 통과하고, 평년의 2월 29일은 걸러 낸다', () => {
    expect(toIsoDate(20280229)).toBe('2028-02-29');
    expect(toIsoDate(20270229)).toBeNull();
  });
});

describe('parseHolidayResponse', () => {
  it('여러 개(배열)를 { 날짜: 이름 }으로 바꾼다', () => {
    const json = ok({ item: [item(20260101, '1월1일'), item(20260217, '설날')] }, 2);
    expect(parseHolidayResponse(json)).toEqual({ '2026-01-01': '1월1일', '2026-02-17': '설날' });
  });

  it('1개이면 item이 배열이 아니라 객체로 오는데, 똑같이 처리한다', () => {
    expect(parseHolidayResponse(ok({ item: item(20260301, '삼일절') }, 1))).toEqual({ '2026-03-01': '삼일절' });
  });

  it.each([
    ['items가 빈 글자', ok('', 0)],
    ['items가 없음', ok(undefined, 0)],
    ['item이 없음', ok({}, 0)],
  ])('0개이면 빈 객체다 (%s)', (_이름, json) => {
    expect(parseHolidayResponse(json)).toEqual({});
  });

  it('쉬는 날이 아닌 항목(isHoliday: N)은 제외한다', () => {
    const json = ok({ item: [item(20260508, '어버이날', { isHoliday: 'N' }), item(20260505, '어린이날')] }, 2);
    expect(parseHolidayResponse(json)).toEqual({ '2026-05-05': '어린이날' });
  });

  it('isHoliday가 아예 없는 항목은 포함한다 (있는 그대로 쉬는 날로 본다)', () => {
    const json = ok({ item: { locdate: 20260606, dateName: '현충일' } }, 1);
    expect(parseHolidayResponse(json)).toEqual({ '2026-06-06': '현충일' });
  });

  it('같은 날이 두 번 나오면 이름을 " · "로 합치고, 같은 이름이면 한 번만 쓴다', () => {
    const merged = parseHolidayResponse(ok({ item: [item(20260525, '대체공휴일'), item(20260525, '부처님오신날')] }, 2));
    expect(merged['2026-05-25']).toBe('대체공휴일 · 부처님오신날');
    const same = parseHolidayResponse(ok({ item: [item(20260525, '대체공휴일'), item(20260525, '대체공휴일')] }, 2));
    expect(same['2026-05-25']).toBe('대체공휴일');
  });

  it('이름 앞뒤 공백을 지운다', () => {
    expect(parseHolidayResponse(ok({ item: item(20260101, '  신정 ') }, 1))).toEqual({ '2026-01-01': '신정' });
  });

  it('API가 오류 코드를 주면 코드와 메시지가 들어간 오류를 던진다', () => {
    const json = { response: { header: { resultCode: '30', resultMsg: 'SERVICE KEY IS NOT REGISTERED ERROR.' } } };
    expect(() => parseHolidayResponse(json)).toThrow(/30.*SERVICE KEY IS NOT REGISTERED/);
  });

  it('header가 없는 엉뚱한 응답은 오류다', () => {
    expect(() => parseHolidayResponse({})).toThrow(/response\.header/);
    expect(() => parseHolidayResponse(null)).toThrow(/response\.header/);
  });

  it('날짜를 읽을 수 없거나 이름이 빈 항목은 조용히 넘기지 않고 오류다', () => {
    expect(() => parseHolidayResponse(ok({ item: item('2026-01-01', '신정') }, 1))).toThrow(/날짜를 읽을 수 없는/);
    expect(() => parseHolidayResponse(ok({ item: item(20260101, '   ') }, 1))).toThrow(/이름이 비어/);
    expect(() => parseHolidayResponse(ok({ item: item(20260101, undefined) }, 1))).toThrow(/이름이 비어/);
  });
});

describe('assertYear / sortByDate', () => {
  it('모두 그 해의 날짜이면 통과한다', () => {
    expect(() => assertYear({ '2026-01-01': 'a', '2026-12-25': 'b' }, 2026)).not.toThrow();
    expect(() => assertYear({}, 2026)).not.toThrow();
  });

  it('다른 해의 날짜가 섞여 있으면 오류다', () => {
    expect(() => assertYear({ '2026-01-01': 'a', '2027-01-01': 'b' }, 2026)).toThrow(/2027-01-01/);
  });

  it('날짜 순서로 정렬한 새 객체를 돌려주고 원본은 바꾸지 않는다', () => {
    const input = { '2026-10-03': 'c', '2026-01-01': 'a', '2026-05-05': 'b' };
    expect(Object.keys(sortByDate(input))).toEqual(['2026-01-01', '2026-05-05', '2026-10-03']);
    expect(Object.keys(input)).toEqual(['2026-10-03', '2026-01-01', '2026-05-05']);
  });
});

describe('explainNonJson (JSON이 아닌 응답을 알아듣게 설명)', () => {
  it.each([
    ['<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>30</returnReasonCode><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>', /등록되지 않은 인증키/],
    ['<returnAuthMsg>SERVICE ACCESS DENIED ERROR</returnAuthMsg>', /권한이 없습니다/],
    ['<returnAuthMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</returnAuthMsg>', /호출 한도/],
    ['<returnAuthMsg>SERVICE_TIME_OUT</returnAuthMsg>', /일시적인 오류/],
    ['<html><body>뭔가</body></html>', /XML/],
    ['그냥 글자', /JSON이 아닌/],
  ])('%s → 설명', (text, expected) => {
    expect(explainNonJson(text)).toMatch(expected);
  });

  it('응답 원문(요청 주소·인증키가 들어 있을 수 있음)을 설명에 그대로 넣지 않는다', () => {
    const text = '<error>serviceKey=SECRET123 http://apis.data.go.kr/?serviceKey=SECRET123</error>';
    expect(explainNonJson(text)).not.toContain('SECRET123');
  });
});

describe('normalizeServiceKey', () => {
  it('앞뒤 공백을 지운다', () => {
    expect(normalizeServiceKey('  abc123  ')).toBe('abc123');
  });

  it('"Encoding" 키(% 기호 포함)는 풀어서 "Decoding" 키 모양으로 맞춘다 (둘 중 어느 것을 붙여도 같은 결과)', () => {
    expect(normalizeServiceKey('abc%2Bdef%2Fghi%3D%3D')).toBe('abc+def/ghi==');
    expect(normalizeServiceKey('abc+def/ghi==')).toBe('abc+def/ghi==');
  });

  it.each([[undefined], [null], [''], ['   ']])('비어 있으면 빈 글자다 (%s)', (value) => {
    expect(normalizeServiceKey(value)).toBe('');
  });
});

describe('buildRequestUrl', () => {
  it('https 주소에 키·연도·365개·JSON 형식이 들어간다', () => {
    const url = buildRequestUrl('KEY+/==', 2026);
    expect(url.protocol).toBe('https:');
    expect(url.origin + url.pathname).toBe('https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo');
    expect(url.searchParams.get('serviceKey')).toBe('KEY+/=='); // 특수문자는 주소에 안전하게 인코딩되고, 읽으면 원래대로
    expect(url.searchParams.get('solYear')).toBe('2026');
    expect(url.searchParams.get('numOfRows')).toBe('365');
    expect(url.searchParams.get('_type')).toBe('json');
  });

  it('Encoding 키를 normalize한 뒤 쓰면 % 기호가 이중으로 인코딩되지 않는다', () => {
    const url = buildRequestUrl(normalizeServiceKey('a%2Bb'), 2026);
    expect(url.searchParams.get('serviceKey')).toBe('a+b');
    expect(url.search).not.toContain('%252B'); // 이중 인코딩이면 %252B가 된다
  });
});
