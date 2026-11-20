import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/auth/AuthGate.jsx'
import PlannerLoader from './components/auth/PlannerLoader.jsx'

// 1) 문지기(AuthGate)가 로그인했는지 본다
// 2) 로그인했으면 PlannerLoader가 그 사람의 일정을 수파베이스에서 가져온다
// 3) 다 가져오면 플래너(App)를 그린다. 저장도 수파베이스로 한다(persist)
// account = { userId, email, onSignOut }: 상단 바에 이메일과 로그아웃 버튼을 보여 줄 때 쓴다.
// key={userId}: 다른 계정으로 바뀌면 화면을 새로 만들어, 앞 사람의 일정이 남지 않게 한다.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      {(account) => (
        <PlannerLoader key={account.userId} userId={account.userId}>
          {(store) => <App account={account} initialData={store.initialData} persist={store.persist} />}
        </PlannerLoader>
      )}
    </AuthGate>
  </StrictMode>,
)
