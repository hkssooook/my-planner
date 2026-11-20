import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { loadRemotePlanner, saveRemotePlanner } from '@/utils/remotePlanner';
import { isMigrationDone, markMigrationDone, mergePlanner, readLocalPlanner } from '@/utils/migrateLocal';

// 로그인한 사람의 플래너 데이터를 수파베이스에서 가져오는 동안 "불러오는 중…"을 보여 주고,
// 다 가져오면 children을 그린다. 가져오지 못하면 [다시 시도]를 보여 준다.
// 이 브라우저 서랍에 예전 일정이 있고 아직 물어본 적이 없으면, 플래너를 보여 주기 전에 "내 계정으로 옮길까요?"를 묻는다.
//   userId     로그인한 사람 번호 (AuthGate가 넘긴다)
//   children   ({ initialData, persist }) => 화면.  usePlannerData에 그대로 넘긴다
//              initialData = { events, timeBlocks },  persist = (changes) => Promise (수파베이스에 쓰기)
//   client     시험할 때만 넘기는 가짜 수파베이스
export default function PlannerLoader({ userId, children, client = supabase }) {
  // 'loading' 불러오는 중 | 'error' 실패 | { kind: 'offer', remote, local } 옮길지 묻는 중 | { kind: 'ready', data } 다 됨
  const [state, setState] = useState('loading');
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState(false);

  const load = useCallback(() => {
    let alive = true; // 화면이 닫힌 뒤에 결과가 도착하면 무시한다
    loadRemotePlanner(client, userId)
      .then(({ events, timeBlocks }) => {
        if (!alive) return;
        const remote = { events, timeBlocks };
        const local = isMigrationDone() ? null : readLocalPlanner();
        setState(local ? { kind: 'offer', remote, local } : { kind: 'ready', data: remote });
      })
      .catch((error) => {
        console.error('수파베이스에서 플래너를 불러오지 못했습니다.', error);
        if (alive) setState('error');
      });
    return () => { alive = false; };
  }, [client, userId]);

  useEffect(() => load(), [load]);

  // [옮기기]: 계정 데이터에 서랍 데이터를 합쳐 수파베이스에 쓰고, 성공하면 플래너를 보여 준다
  const migrate = async () => {
    const merged = mergePlanner(state.remote, state.local);
    setMigrating(true);
    setMigrateError(false);
    try {
      await saveRemotePlanner(client, userId, merged);
      markMigrationDone('migrated', userId);
      setState({ kind: 'ready', data: merged });
    } catch (error) {
      console.error('예전 일정을 옮기지 못했습니다.', error);
      setMigrateError(true);
    } finally {
      setMigrating(false);
    }
  };

  // [건너뛰기]: 옮기지 않는다. 서랍 속 일정은 그대로 남는다
  const skip = () => {
    markMigrationDone('skipped', userId);
    setState({ kind: 'ready', data: state.remote });
  };

  if (state === 'loading') return <Message>일정을 불러오는 중…</Message>;
  if (state === 'error') {
    return (
      <Message>
        일정을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.
        <Button className="mt-4 rounded-full" onClick={() => { setState('loading'); load(); }}>다시 시도</Button>
      </Message>
    );
  }

  if (state.kind === 'offer') {
    const { eventCount, blockCount } = state.local;
    return (
      <Message role="dialog" label="예전 일정 옮기기">
        <h1 className="text-lg font-bold">예전 일정을 옮길까요?</h1>
        <p className="mt-2">
          이 브라우저에 예전 일정 <strong>{eventCount}개</strong>와 시간 카드 <strong>{blockCount}개</strong>가 있어요.
          내 계정으로 옮기면 다른 기기에서도 볼 수 있어요.
        </p>
        <p className="mt-2 text-muted-foreground">
          계정에 이미 있는 일정은 그대로 두고 합쳐요. 이 브라우저의 예전 일정도 지우지 않아요.
        </p>
        {migrateError && (
          <p role="alert" className="mt-2 text-destructive">옮기지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="rounded-full" onClick={skip} disabled={migrating}>건너뛰기</Button>
          <Button className="rounded-full" onClick={migrate} disabled={migrating}>
            {migrating ? '옮기는 중…' : '옮기기'}
          </Button>
        </div>
      </Message>
    );
  }

  const persist = (changes) => saveRemotePlanner(client, userId, changes);
  return children({ initialData: state.data, persist });
}

// 화면 가운데 흰 카드. 기본은 안내(role="status"), 물어볼 때는 role="dialog"
function Message({ children, role = 'status', label }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div role={role} aria-label={label} className="max-w-sm rounded-2xl bg-card p-6 text-sm text-foreground text-center flex flex-col items-center">
        {children}
      </div>
    </main>
  );
}
