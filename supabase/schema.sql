-- 플래너 데이터를 담는 표와, "자기 줄만" 읽고 쓰게 하는 규칙(RLS).
-- 수파베이스 대시보드 → SQL Editor → New query에 이 파일 내용을 통째로 붙여 넣고 Run을 누른다.
-- 여러 번 실행해도 망가지지 않게 썼다. (이미 있으면 건너뛰거나 다시 만든다)
--
-- 모양: 한 사람 = 한 줄. [저장]을 누르면 내 줄 하나를 통째로 바꾼다.
--   (브라우저 저장소에서 planner_events, planner_time_blocks에 저장하던 것과 같은 값을 그대로 담는다)
--   user_id      누구 데이터인지. 수파베이스 로그인 사용자 번호(auth.users의 id)
--   events       기간·종일 일정 목록      [{ id, title, start_date, end_date, color, todos? }]
--   time_blocks  날짜별 시간 일정 카드    { '2026-01-05': [{ id, start, end, content, color, is_important, todos? }] }
--   updated_at   마지막으로 저장한 시각

create table if not exists public.planner_data (
  -- 사용자 한 명에 한 줄만 있도록 user_id를 기본 키로 삼는다.
  -- 사용자 계정이 지워지면(on delete cascade) 그 사람의 데이터도 함께 지운다.
  user_id uuid primary key references auth.users (id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  time_blocks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 문 잠그기: RLS를 켜면 아래 규칙(policy)에 맞는 줄만 읽고 쓸 수 있다.
-- (프로젝트에서 "Enable automatic RLS"를 켰다면 이미 켜져 있지만, 이 파일만 봐도 알 수 있게 적어 둔다)
alter table public.planner_data enable row level security;

-- 로그인한 사용자(authenticated)에게만 이 표를 쓸 권한을 준다. 로그인 안 한 사람(anon)은 아예 못 쓴다.
revoke all on public.planner_data from anon;
grant select, insert, update, delete on public.planner_data to authenticated;

-- 규칙: user_id가 "지금 로그인한 사람의 번호(auth.uid())"인 줄만 보고·만들고·고치고·지울 수 있다.
-- (select auth.uid())처럼 괄호로 감싸면 줄마다 다시 계산하지 않아 빠르다 (수파베이스 권장 방식).
drop policy if exists "자기 데이터만 보기" on public.planner_data;
create policy "자기 데이터만 보기" on public.planner_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "자기 데이터만 만들기" on public.planner_data;
create policy "자기 데이터만 만들기" on public.planner_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "자기 데이터만 고치기" on public.planner_data;
create policy "자기 데이터만 고치기" on public.planner_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "자기 데이터만 지우기" on public.planner_data;
create policy "자기 데이터만 지우기" on public.planner_data
  for delete to authenticated
  using ((select auth.uid()) = user_id);
