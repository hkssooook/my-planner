import { describe, it, expect, vi } from 'vitest';
import { fetchYearHolidays } from './holidays-fetch.mjs';
import { getCurrentYear, getYearOptions } from '../src/utils/date.js';
import { YEAR_RANGE } from '../src/constants/calendar.js';

const KEY = 'SECRET-KEY-VALUE-123';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const text = (body, status = 200) => new Response(body, { status });
const okBody = (items) => ({ response: { header: { resultCode: '00', resultMsg: 'OK' }, body: { items, totalCount: 1 } } });

describe('fetchYearHolidays', () => {
  it('정상 응답을 날짜 순서의 { 날짜: 이름 }으로 돌려준다', async () => {
    const fetchImpl = vi.fn(async () => json(okBody({ item: [{ locdate: 20260217, dateName: '설날' }, { locdate: 20260101, dateName: '신정' }] })));
    const result = await fetchYearHolidays(KEY, 2026, fetchImpl);
    expect(Object.entries(result)).toEqual([['2026-01-01', '신정'], ['2026-02-17', '설날']]);
  });

  it('요청 주소에 연도와 키가 들어간다 (키는 요청에만 쓰인다)', async () => {
    const fetchImpl = vi.fn(async () => json(okBody('')));
    await fetchYearHolidays(KEY, 2027, fetchImpl);
    const url = fetchImpl.mock.calls[0][0];
    expect(url.searchParams.get('solYear')).toBe('2027');
    expect(url.searchParams.get('serviceKey')).toBe(KEY);
  });

  it('공휴일이 없는 해는 빈 객체다', async () => {
    expect(await fetchYearHolidays(KEY, 2040, async () => json(okBody('')))).toEqual({});
  });

  it('XML 오류 응답(등록되지 않은 키)은 이유를 설명하는 오류가 된다', async () => {
    const fetchImpl = async () => text('<OpenAPI_ServiceResponse><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></OpenAPI_ServiceResponse>');
    await expect(fetchYearHolidays(KEY, 2026, fetchImpl)).rejects.toThrow(/2026년: 등록되지 않은 인증키/);
  });

  it('HTTP 오류(403 등)는 상태 번호와 이유를 알려 준다', async () => {
    const fetchImpl = async () => text('<returnAuthMsg>SERVICE ACCESS DENIED ERROR</returnAuthMsg>', 403);
    await expect(fetchYearHolidays(KEY, 2026, fetchImpl)).rejects.toThrow(/403.*권한이 없습니다/);
  });

  it('API가 준 오류 코드(resultCode ≠ 00)는 오류가 된다', async () => {
    const fetchImpl = async () => json({ response: { header: { resultCode: '22', resultMsg: 'LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR.' } } });
    await expect(fetchYearHolidays(KEY, 2026, fetchImpl)).rejects.toThrow(/2026년: .*22/);
  });

  it('다른 해의 날짜가 섞여 오면 오류다', async () => {
    const fetchImpl = async () => json(okBody({ item: { locdate: 20270101, dateName: '신정' } }));
    await expect(fetchYearHolidays(KEY, 2026, fetchImpl)).rejects.toThrow(/2027-01-01/);
  });

  it('네트워크 실패는 연결 확인을 안내하고, 오류 메시지(주소·키가 들어갈 수 있음)는 보여 주지 않는다', async () => {
    const fetchImpl = async () => {
      throw new TypeError(`fetch failed: https://apis.data.go.kr/?serviceKey=${KEY}`);
    };
    const error = await fetchYearHolidays(KEY, 2026, fetchImpl).catch((e) => e);
    expect(error.message).toMatch(/2026년 요청에 실패했습니다 \(TypeError\).*인터넷 연결/);
    expect(error.message).not.toContain(KEY);
  });

  it.each([
    ['XML 오류', () => text(`<error>${KEY}</error>`)],
    ['HTTP 오류', () => text(`<error>${KEY}</error>`, 500)],
    ['API 오류 코드', () => json({ response: { header: { resultCode: '99', resultMsg: 'ERR' } } })],
    ['날짜 형식 오류', () => json(okBody({ item: { locdate: 'x', dateName: 'y' } }))],
  ])('어떤 실패에서도 오류 메시지에 인증키가 들어가지 않는다 (%s)', async (_이름, makeResponse) => {
    const error = await fetchYearHolidays(KEY, 2026, async () => makeResponse()).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).not.toContain(KEY);
  });
});

describe('동기화 기본 연도', () => {
  it('앱의 연도 선택지와 같은 함수·범위를 쓴다 (올해 -1년 ~ +3년, 5개)', () => {
    expect(getYearOptions(2026, YEAR_RANGE)).toEqual([2025, 2026, 2027, 2028, 2029]);
    expect(getYearOptions(getCurrentYear(), YEAR_RANGE)).toHaveLength(5);
  });
});
