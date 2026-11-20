import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthGate from './AuthGate';

// 진짜 수파베이스 대신 쓰는 가짜. 로그인·가입 결과를 시험마다 정할 수 있다.
//   session      처음에 기억된 로그인 (null이면 로그인 안 함)
//   signInResult, signUpResult   수파베이스가 돌려줄 값
function fakeClient({ session = null, signInResult, signUpResult } = {}) {
  let notify = () => {};
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn((callback) => {
        notify = (next) => callback('EVENT', next);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn(async () => {
        if (signInResult?.data?.session) notify(signInResult.data.session);
        return signInResult ?? { data: {}, error: null };
      }),
      signUp: vi.fn(async () => {
        if (signUpResult?.data?.session) notify(signUpResult.data.session);
        return signUpResult ?? { data: {}, error: null };
      }),
      signOut: vi.fn(async () => { notify(null); return { error: null }; }),
    },
  };
  return client;
}

const session = { user: { email: 'me@example.com', identities: [{}] } };
const planner = ({ email, onSignOut }) => (
  <div>
    <p>플래너: {email}</p>
    <button onClick={onSignOut}>로그아웃</button>
  </div>
);

async function fillAndSubmit(user, buttonName) {
  await user.type(screen.getByLabelText('이메일'), 'me@example.com');
  await user.type(screen.getByLabelText('비밀번호'), 'secret123');
  await user.click(screen.getByRole('button', { name: buttonName }));
}

describe('AuthGate: 로그인 문지기', () => {
  it('연결 정보가 없으면 .env를 채우라고 알려 준다', () => {
    render(<AuthGate client={null}>{planner}</AuthGate>);
    expect(screen.getByRole('status')).toHaveTextContent('VITE_SUPABASE_URL');
  });

  it('로그인 안 했으면 로그인 화면, 기억된 로그인이 있으면 바로 플래너', async () => {
    const { unmount } = render(<AuthGate client={fakeClient()}>{planner}</AuthGate>);
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
    unmount();

    render(<AuthGate client={fakeClient({ session })}>{planner}</AuthGate>);
    expect(await screen.findByText('플래너: me@example.com')).toBeInTheDocument();
  });

  it('이메일·비밀번호로 로그인하면 플래너가 보이고, 로그아웃하면 로그인 화면으로 돌아간다', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ signInResult: { data: { session }, error: null } });
    render(<AuthGate client={client}>{planner}</AuthGate>);

    await screen.findByRole('heading', { name: '로그인' });
    await fillAndSubmit(user, '로그인');
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'me@example.com', password: 'secret123' });
    expect(await screen.findByText('플래너: me@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('비밀번호가 틀리면 한국어로 알려 준다', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ signInResult: { data: {}, error: { code: 'invalid_credentials' } } });
    render(<AuthGate client={client}>{planner}</AuthGate>);

    await screen.findByRole('heading', { name: '로그인' });
    await fillAndSubmit(user, '로그인');
    expect(await screen.findByRole('alert')).toHaveTextContent('이메일이나 비밀번호가 맞지 않아요.');
  });

  it('회원가입: 확인 메일이 필요하면 안내하고 로그인 화면으로 돌아간다', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ signUpResult: { data: { user: { identities: [{}] }, session: null }, error: null } });
    render(<AuthGate client={client}>{planner}</AuthGate>);

    await user.click(await screen.findByRole('button', { name: '회원가입' }));
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument();
    await fillAndSubmit(user, '회원가입');

    expect(await screen.findByRole('status')).toHaveTextContent('확인 메일을 보냈어요');
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it('회원가입: 이미 가입한 이메일이면 로그인하라고 알려 준다', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ signUpResult: { data: { user: { identities: [] }, session: null }, error: null } });
    render(<AuthGate client={client}>{planner}</AuthGate>);

    await user.click(await screen.findByRole('button', { name: '회원가입' }));
    await fillAndSubmit(user, '회원가입');
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 가입한 이메일');
  });
});
