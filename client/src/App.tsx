import { useState, useEffect } from 'react';
import { isLoggedIn, logout } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import './index.css';
import './App.css';

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn);

  useEffect(() => {
    if (!authed) {
      // Poll for cookie changes (login via other tab)
      const interval = setInterval(() => {
        if (isLoggedIn()) setAuthed(true);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [authed]);

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  return (
    <>
      <DashboardPage />
      <button className="logout-btn" onClick={() => { logout(); setAuthed(false); }}>
        Sign out
      </button>
    </>
  );
}