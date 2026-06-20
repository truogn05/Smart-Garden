import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isLoggedIn, API_BASE } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { WateringPage } from './pages/WateringPage';
import { SoilWeatherPage } from './pages/SoilWeatherPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppShell } from './layouts/AppShell';
import './index.css';

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [checkingAuth, setCheckingAuth] = useState(isLoggedIn());

  useEffect(() => {
    async function verifyAuth() {
      if (!isLoggedIn()) {
        setCheckingAuth(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          setAuthed(true);
        } else {
          // Token on server is invalid or expired, clear client session state
          localStorage.removeItem('logged_in');
          document.cookie = 'logged_in=; Max-Age=0; path=/';
          setAuthed(false);
        }
      } catch (err) {
        // Network/server offline error - keep authed state as fallback
        console.error('[App] Server connection error during auth verification:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    verifyAuth();
  }, []);

  useEffect(() => {
    // Lắng nghe sự kiện logout từ useAuth.logout() để re-render ngay lập tức
    // mà không cần page reload
    const handleLogout = () => setAuthed(false);
    window.addEventListener('app:logout', handleLogout);
    return () => window.removeEventListener('app:logout', handleLogout);
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="font-label-md text-label-md text-on-surface-variant animate-pulse">VERIFYING SESSION...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={() => setAuthed(true)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/watering" element={<WateringPage />} />
          <Route path="/soil-weather" element={<SoilWeatherPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
