import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { authErrorMessage } from '@/utils/authErrors';

// 로그인 화면: 이메일·비밀번호 칸과 [로그인] 버튼. 아래 글자 버튼으로 "회원가입"과 오갈 수 있다.
//   onSignIn(email, password)  → { error }
//   onSignUp(email, password)  → { error, needsEmailConfirm }
// 수파베이스는 useAuth가 맡고, 이 화면은 입력과 안내 문구만 맡는다.
export default function LoginScreen({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signIn'); // 'signIn' 로그인 | 'signUp' 회원가입
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isSignUp = mode === 'signUp';

  const switchMode = () => {
    setMode(isSignUp ? 'signIn' : 'signUp');
    setError('');
    setNotice('');
  };

  const submit = async (e) => {
    e.preventDefault(); // 폼을 보내면 브라우저가 화면을 새로 고치는 것을 막는다
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (isSignUp) {
        const result = await onSignUp(email.trim(), password);
        if (result.error) setError(authErrorMessage(result.error));
        else if (result.needsEmailConfirm) {
          setNotice(`${email.trim()}로 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.`);
          setMode('signIn');
        }
        // 확인 메일이 필요 없으면 바로 로그인되어 플래너 화면으로 넘어간다
      } else {
        const result = await onSignIn(email.trim(), password);
        if (result.error) setError(authErrorMessage(result.error));
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const title = isSignUp ? '회원가입' : '로그인';

  return (
    // 화면 가운데에 흰 카드 하나. 바탕은 플래너의 기본 바탕(파랑)과 같다
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        aria-labelledby="login-title"
        className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-lg flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1">
          <h1 id="login-title" className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? '이메일과 비밀번호로 계정을 만들어요.' : '플래너를 쓰려면 로그인해 주세요.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-semibold text-foreground">이메일</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="text-sm font-semibold text-foreground">비밀번호</label>
          <input
            id="login-password"
            type="password"
            // 브라우저의 비밀번호 저장·자동 채우기가 로그인/가입을 구분하게 한다
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={isSignUp ? 'login-password-hint' : undefined}
            className="px-3 py-2 border border-input rounded-md focus:outline-hidden focus:ring-2 focus:ring-ring text-sm"
          />
          {isSignUp && <p id="login-password-hint" className="text-xs text-muted-foreground">6자 이상</p>}
        </div>

        {/* 오류는 화면 낭독기가 바로 읽도록 role="alert", 안내는 role="status" */}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-success-text">{notice}</p>}

        <Button type="submit" disabled={busy} className="h-10 rounded-full font-semibold">
          {busy ? '잠시만요…' : title}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          {isSignUp ? '이미 계정이 있나요?' : '처음이신가요?'}{' '}
          <button type="button" onClick={switchMode} className="font-semibold text-primary hover:underline">
            {isSignUp ? '로그인' : '회원가입'}
          </button>
        </p>
      </form>
    </main>
  );
}
