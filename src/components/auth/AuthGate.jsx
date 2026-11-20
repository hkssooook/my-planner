import { supabase } from '@/lib/supabase';
import useAuth from '@/hooks/useAuth';
import LoginScreen from './LoginScreen';

// 문지기: 로그인했으면 children(플래너)을, 안 했으면 로그인 화면을 보여 준다.
//   children   로그인한 뒤 보여 줄 화면을 그리는 함수. ({ userId, email, onSignOut })를 받는다
//              예: <AuthGate>{(account) => <App account={account} />}</AuthGate>
//   client     시험할 때만 넘기는 가짜 수파베이스. 보통은 넘기지 않는다 (useAuth 참고)
// 시험(App.*.test.jsx)은 App을 바로 그리므로 로그인 없이 돌아간다.
export default function AuthGate({ children, client = supabase }) {
  const auth = useAuth(client);

  // .env에 수파베이스 주소·키가 없을 때 (lib/supabase.js가 null을 준다)
  if (!client) {
    return (
      <Centered>
        수파베이스 연결 정보가 없어요. .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣고 개발 서버를 다시 켜 주세요.
      </Centered>
    );
  }

  // 브라우저에 기억된 로그인을 확인하는 아주 짧은 순간. 로그인 화면이 깜빡이지 않게 빈 바탕만 보여 준다
  if (auth.isChecking) return <Centered>로그인 확인 중…</Centered>;

  if (!auth.user) return <LoginScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />;

  return children({ userId: auth.user.id, email: auth.user.email, onSignOut: auth.signOut });
}

function Centered({ children }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <p role="status" className="max-w-sm rounded-2xl bg-card p-6 text-sm text-foreground text-center">{children}</p>
    </main>
  );
}
