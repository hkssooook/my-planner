import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS, loadJSON, saveJSON } from './storage';

// 시험마다 저장소를 비우고, 바꿔치기(spy)한 것은 원래대로 돌려놓는다.
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// 오류가 일부러 나는 시험에서 콘솔이 빨간 글씨로 어지러워지지 않게 막고, 호출됐는지는 확인할 수 있게 한다.
const silenceConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {});

describe('STORAGE_KEYS (저장소 이름표)', () => {
  it('이미 저장된 사용자 데이터를 찾을 수 있도록 이름표가 바뀌지 않아야 한다', () => {
    expect(STORAGE_KEYS).toEqual({
      events: 'planner_events',
      daily: 'planner_daily',
      timeBlocks: 'planner_time_blocks',
    });
  });
});

describe('loadJSON (읽기)', () => {
  it('저장된 게 없으면 기본값 null을 돌려준다', () => {
    expect(loadJSON('없는키')).toBeNull();
  });

  it('저장된 게 없을 때 지정한 기본값을 돌려준다', () => {
    expect(loadJSON('없는키', [])).toEqual([]);
    expect(loadJSON('없는키', {})).toEqual({});
  });

  it('올바른 값은 저장된 모양 그대로 돌려준다', () => {
    localStorage.setItem('a', JSON.stringify([{ id: 1, title: '여름휴가' }]));
    expect(loadJSON('a')).toEqual([{ id: 1, title: '여름휴가' }]);
  });

  it('빈 문자열이 저장돼 있으면 기본값을 돌려준다', () => {
    localStorage.setItem('a', '');
    expect(loadJSON('a', 'fallback')).toBe('fallback');
  });

  it('내용이 깨져 있어도 오류를 던지지 않고 기본값을 돌려준다', () => {
    const errorSpy = silenceConsoleError();
    localStorage.setItem('a', '{"broken": [');
    expect(() => loadJSON('a', 'fallback')).not.toThrow();
    expect(loadJSON('a', 'fallback')).toBe('fallback');
    expect(errorSpy).toHaveBeenCalled(); // 조용히 넘기지 않고 콘솔에는 남긴다
  });

  it('저장소 접근이 막혀 있어도 오류를 던지지 않고 기본값을 돌려준다', () => {
    silenceConsoleError();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('저장소 접근 차단');
    });
    expect(loadJSON('a', 'fallback')).toBe('fallback');
  });

  it('올바른 JSON이면 모양이 엉뚱해도 그대로 돌려준다 (모양 검사는 쓰는 쪽의 몫)', () => {
    localStorage.setItem('a', '"hello"');
    expect(loadJSON('a', [])).toBe('hello');
  });
});

describe('saveJSON (쓰기)', () => {
  it('저장하면 true를 돌려주고, 다시 읽으면 같은 값이 나온다 (한글·중첩 포함)', () => {
    const value = { '2026-01-05': [{ hour: 9, content: '아침 회의', is_important: true }] };
    expect(saveJSON('a', value)).toBe(true);
    expect(loadJSON('a')).toEqual(value);
  });

  it('같은 이름으로 다시 저장하면 덮어쓴다', () => {
    saveJSON('a', [1]);
    saveJSON('a', [2, 3]);
    expect(loadJSON('a')).toEqual([2, 3]);
  });

  it('저장 공간이 부족해도 오류를 던지지 않고 false를 돌려준다', () => {
    const errorSpy = silenceConsoleError();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('저장 공간 부족', 'QuotaExceededError');
    });
    expect(() => saveJSON('a', [1])).not.toThrow();
    expect(saveJSON('a', [1])).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('JSON으로 바꿀 수 없는 값(자기 자신을 가리키는 객체)도 오류를 던지지 않고 false를 돌려준다', () => {
    silenceConsoleError();
    const circular = {};
    circular.self = circular;
    expect(saveJSON('a', circular)).toBe(false);
  });

  it('저장에 실패하면 기존에 저장돼 있던 값은 그대로 남는다', () => {
    silenceConsoleError();
    saveJSON('a', ['원래 값']);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('실패');
    });
    saveJSON('a', ['새 값']);
    vi.restoreAllMocks();
    expect(loadJSON('a')).toEqual(['원래 값']);
  });
});
