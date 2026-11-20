import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/auth/AuthGate.jsx'

// 문지기(AuthGate)가 로그인했는지 보고, 로그인했으면 플래너(App)를 그린다.
// account = { email, onSignOut }: 상단 바에 이메일과 로그아웃 버튼을 보여 줄 때 쓴다.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>{(account) => <App account={account} />}</AuthGate>
  </StrictMode>,
)
