import { useState } from 'react';
import { login, register } from '../hooks/useAuth';

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
        await login(email, password);
      }
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#1a5c2a"/>
            <path d="M24 10c-7.7 0-14 6.3-14 14 0 5.2 2.9 9.8 7 12.2V40c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-3.8c4.1-2.4 7-7 7-12.2 0-7.7-6.3-14-14-14zm-4 36v-2h8v2h-8zm10-6H18v-4h22v4zm2-6H16v-4.2c-.7.5-1.6.8-2.5.8-2.2 0-4-1.8-4-4 0-1.5.8-2.8 2-3.6v-2.6c0-.5-.2-1-.5-1.4L12 18c-1.7-1.3-2.8-3.4-2.8-5.7C9.2 7.5 16.2 1 24.5 1 33 1 40 8.5 40 17.3c0 2.3-1.1 4.4-2.8 5.7l-.8.6c-.3.4-.5.9-.5 1.4v2.6c1.2.8 2 2.1 2 3.6 0 2.2-1.8 4-4 4-.9 0-1.8-.3-2.5-.8V24z" fill="#4ade80"/>
          </svg>
          <h1>SmartGarden</h1>
        </div>
        <p className="login-subtitle">Monitor and control your garden</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="form-label">
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>
          <label className="form-label">
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="btn-link"
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}