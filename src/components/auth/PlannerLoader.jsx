import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { loadRemotePlanner, saveRemotePlanner } from '@/utils/remotePlanner';

// 로그인한 사람의 플래너 데이터를 수파베이스에서 가져오는 동안 "불러오는 중…"을 보여 주고,
// 다 가져오면 children을 그린다. 가져오지 못하면 [다시 시도]를 보여 준다.
//   userId     로그인한 사람 번호 (AuthGate가 넘긴다)
//   children   ({ initialData, persist }) => 화면.  usePlannerData에 그대로 넘긴다
//              initialData = { events, timeBlocks },  persist = (changes) => Promise (수파베이스에 쓰기)
//   client     시험할 때만 넘기는 가짜 수파베이스
export default function PlannerLoader({ userId, children, client = supabase }) {
  // 'loading' 불러오는 중 | 'error' 실패 | { events, timeBlocks } 다 가져옴
  const [state, setState] = useState('loading');

  const load = useCallback(() => {
    let alive = true; // 화면이 닫힌 뒤에 결과가 도착하면 무시한다
    loadRemotePlanner(client, userId)
      .then((data) => { if (alive) setState(data); })
      .catch((error) => {
        console.error('수파베이스에서 플래너를 불러오지 못했습니다.', error);
        if (alive) setState('error');
      });
    return () => { alive = false; };
  }, [client, userId]);

  useEffect(() => load(), [load]);

  if (state === 'loading') return <Message>일정을 불러오는 중…</Message>;
  if (state === 'error') {
    return (
      <Message>
        일정을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.
        <Button className="mt-4 rounded-full" onClick={() => { setState('loading'); load(); }}>다시 시도</Button>
      </Message>
    );
  }

  const persist = (changes) => saveRemotePlanner(client, userId, changes);
  return children({ initialData: { events: state.events, timeBlocks: state.timeBlocks }, persist });
}

function Message({ children }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div role="status" className="max-w-sm rounded-2xl bg-card p-6 text-sm text-foreground text-center flex flex-col items-center">
        {children}
      </div>
    </main>
  );
}
