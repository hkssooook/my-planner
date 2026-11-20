import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';

describe('authErrorMessage: 수파베이스 오류를 한국어로', () => {
  it('오류가 없으면 빈 글자', () => {
    expect(authErrorMessage(null)).toBe('');
  });

  it('code로 알아본다', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('이메일이나 비밀번호가 맞지 않아요.');
    expect(authErrorMessage({ code: 'weak_password' })).toMatch('6자 이상');
  });

  it('code가 없는 예전 오류는 영어 문장으로 알아본다', () => {
    expect(authErrorMessage({ message: 'Email not confirmed' })).toMatch('이메일 확인');
    expect(authErrorMessage({ message: 'User already registered' })).toMatch('이미 가입한 이메일');
  });

  it('연결 실패와 모르는 오류도 한국어로 알려 준다', () => {
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toMatch('인터넷 연결');
    expect(authErrorMessage({ message: 'something odd' })).toMatch('문제가 생겼어요');
  });
});
