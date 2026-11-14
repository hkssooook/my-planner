import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KR_HOLIDAYS, NAME_OVERRIDES } from './holidays';

// 이 시험은 공휴일 데이터(API에서 받아 온 JSON)가 앱이 믿고 쓸 수 있는 상태인지 확인한다.
// 데이터를 새로 받은 뒤(npm run sync-holidays)에도 이 시험이 통과해야 한다.
const dir = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.join(dir, 'holidays.generated.json'), 'utf-8'));

const entries = Object.entries(KR_HOLIDAYS).flatMap(([year, days]) => Object.entries(days).map(([date, name]) => [year, date, name]));

describe('공휴일 데이터의 형식', () => {
  it('2025~2028년 데이터가 있다', () => {
    for (const year of [2025, 2026, 2027, 2028]) expect(Object.keys(KR_HOLIDAYS[year] ?? {}).length).toBeGreaterThan(10);
  });

  it('모든 항목의 날짜가 YYYY-MM-DD 형식의 진짜 날짜이고, 자기 연도 아래에 들어 있다', () => {
    expect(entries.length).toBeGreaterThan(50);
    for (const [year, date] of entries) {
      expect(date, date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(date.startsWith(`${year}-`), `${year} 아래의 ${date}`).toBe(true);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), date).toBe(date);
    }
  });

  it('모든 이름이 비어 있지 않은 글자다', () => {
    for (const [, date, name] of entries) expect(String(name).trim().length, date).toBeGreaterThan(0);
  });

  it('저장된 JSON은 연도와 날짜가 순서대로 정렬되어 있다 (다시 받아도 바뀐 곳만 git에 보이게)', () => {
    const years = Object.keys(raw).map(Number);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    for (const days of Object.values(raw)) {
      const dates = Object.keys(days);
      expect(dates).toEqual([...dates].sort());
    }
  });
});

describe('공휴일 데이터의 내용 (옛 손으로 적은 데이터에서 틀렸던 곳)', () => {
  it.each([
    ['2026-05-01', '노동절'],
    ['2026-06-03', '전국동시지방선거'],
    ['2026-07-17', '제헌절'],
    ['2026-10-05', '대체공휴일(개천절)'],
  ])('2026년에 빠져 있던 %s (%s)이 들어 있다', (date, name) => {
    expect(KR_HOLIDAYS[2026][date]).toBe(name);
  });

  it('2027년 설날은 2/7·2/8이고 2/9가 대체공휴일이다 (옛 데이터의 2/5는 틀린 날짜였다)', () => {
    expect(KR_HOLIDAYS[2027]['2027-02-05']).toBeUndefined();
    expect(KR_HOLIDAYS[2027]['2027-02-07']).toBe('설날');
    expect(KR_HOLIDAYS[2027]['2027-02-08']).toBe('설날');
    expect(KR_HOLIDAYS[2027]['2027-02-09']).toBe('대체공휴일(설날)');
  });

  it('임시공휴일도 들어 있다 (2025-01-27, 2025-06-03 대통령 선거일)', () => {
    expect(KR_HOLIDAYS[2025]['2025-01-27']).toBe('임시공휴일');
    expect(KR_HOLIDAYS[2025]['2025-06-03']).toContain('임시공휴일');
  });

  it.each([2025, 2026, 2027, 2028])('%s년에 매년 고정인 공휴일이 모두 있다', (year) => {
    const days = KR_HOLIDAYS[year];
    for (const [md, name] of [['01-01', '신정'], ['03-01', '삼일절'], ['05-05', '어린이날'], ['06-06', '현충일'], ['08-15', '광복절'], ['10-03', '개천절'], ['10-09', '한글날'], ['12-25', '기독탄신일']]) {
      expect(days[`${year}-${md}`], `${year}-${md}`).toContain(name);
    }
  });

  it('2026년부터 공휴일이 된 노동절(5/1)과 제헌절(7/17)이 2027·2028년에도 있다', () => {
    for (const year of [2027, 2028]) {
      expect(KR_HOLIDAYS[year][`${year}-05-01`]).toBe('노동절');
      expect(KR_HOLIDAYS[year][`${year}-07-17`]).toBe('제헌절');
    }
  });
});

describe('표시 이름 바꾸기 (NAME_OVERRIDES)', () => {
  it('API가 주는 "1월1일"은 앱에서 "신정"으로 보인다', () => {
    expect(NAME_OVERRIDES['1월1일']).toBe('신정');
    expect(raw[2026]['2026-01-01']).toBe('1월1일'); // JSON 파일은 API 그대로
    expect(KR_HOLIDAYS[2026]['2026-01-01']).toBe('신정');
  });

  it('앱 데이터에는 "1월1일"이 한 군데도 남아 있지 않다', () => {
    expect(entries.filter(([, , name]) => name === '1월1일')).toEqual([]);
  });

  it('바꿀 이름이 아닌 것은 API 이름 그대로다', () => {
    expect(KR_HOLIDAYS[2026]['2026-03-02']).toBe(raw[2026]['2026-03-02']);
    expect(KR_HOLIDAYS[2026]['2026-03-02']).toBe('대체공휴일(삼일절)');
  });
});
