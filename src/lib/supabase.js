// 수파베이스(인터넷 위의 데이터베이스 + 로그인)와 통하는 "전화기"를 한 대 만들어 두는 파일.
// 앱 어디서든 이 파일의 supabase를 불러 쓴다. 예: import { supabase } from '@/lib/supabase';
//
// 주소와 키는 .env 파일에서 읽는다. (.env.example 참고)
// Vite는 이름이 VITE_로 시작하는 값만 앱 화면 코드에 넘겨준다.
// anon 키는 브라우저에 그대로 보이는 "공개용" 키다. 그래서 데이터는 RLS(자기 줄만 읽고 쓰기 규칙)로 지킨다.
// service_role 키는 모든 잠금을 무시하는 관리자 키라서 절대 여기에 넣지 않는다.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 값이 비어 있으면 연결할 수 없다. 앱이 멈추지 않게 null로 두고, 무엇을 채워야 하는지 알려 준다.
if (!url || !anonKey) {
  console.warn('수파베이스 주소나 키가 없습니다. .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣어 주세요.');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
