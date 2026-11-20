import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// "지금 누가 로그인해 있나"를 들고 있고, 로그인·가입·로그아웃을 맡는 훅.
//   session    undefined = 아직 확인 중,  null = 로그인 안 함,  객체 = 로그인함 (session.user.email 등)
//   signIn(email, password)  로그인.  { error }를 돌려준다
//   signUp(email, password)  가입.    { error, needsEmailConfirm }를 돌려준다
//                            needsEmailConfirm이 true면 확인 메일을 보냈고, 링크를 눌러야 로그인할 수 있다
//   signOut()                로그아웃
//
// 로그인 상태는 수파베이스가 브라우저에 기억해 둔다. 그래서 새로 고쳐도 로그인이 유지된다.
// client를 넘기면 그걸 쓴다 (시험할 때 가짜 수파베이스를 넣으려고). 보통은 넘기지 않는다.
export default function useAuth(client = supabase) {
  // 연결 정보가 없으면(client가 null) 확인할 것도 없으니 바로 "로그인 안 함"으로 시작한다
  const [session, setSession] = useState(client ? undefined : null);

  useEffect(() => {
    if (!client) return undefined;
    let alive = true;
    // 1) 처음 켤 때: 브라우저에 기억된 로그인이 있는지 한 번 묻는다
    client.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session ?? null);
    });
    // 2) 그 뒤로는 로그인·로그아웃·토큰 갱신이 일어날 때마다 수파베이스가 알려 준다
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = async (email, password) => {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email, password) => {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error, needsEmailConfirm: false };
    // "이메일 확인"이 켜져 있으면 이미 가입한 이메일이어도 오류 없이 빈 사용자를 돌려준다 (가입 여부를 남에게 숨기려고).
    // 그때는 identities가 빈 목록이다.
    if (data.user && data.user.identities?.length === 0) {
      return { error: { code: 'user_already_exists' }, needsEmailConfirm: false };
    }
    // 세션이 없으면 확인 메일을 보낸 것이다
    return { error: null, needsEmailConfirm: !data.session };
  };

  const signOut = () => client.auth.signOut();

  return { session, user: session?.user ?? null, isChecking: session === undefined, signIn, signUp, signOut };
}
