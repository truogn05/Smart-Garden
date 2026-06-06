import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isLoggedIn } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { WateringPage } from './pages/WateringPage';
import { SoilWeatherPage } from './pages/SoilWeatherPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppShell } from './layouts/AppShell';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(isLoggedIn);

  useEffect(() => {
    if (!authed) {
      const interval = setInterval(() => {
        if (isLoggedIn()) setAuthed(true);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [authed]);

  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn);

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
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
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
