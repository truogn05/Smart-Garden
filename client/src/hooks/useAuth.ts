export const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Global Fetch Interceptor for 401 Unauthorized ──────────────────────────
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const res = await originalFetch(...args);
  if (res.status === 401) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    // Exclude auth endpoints to prevent redirect loops or conflict with initial loading checks
    if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register') && !url.includes('/api/auth/me')) {
      localStorage.removeItem('logged_in');
      document.cookie = 'logged_in=; Max-Age=0; path=/';
      window.dispatchEvent(new Event('app:logout'));
    }
  }
  return res;
};

// ── Auth ──────────────────────────────────────────────────────────────────────

export function isLoggedIn(): boolean {
  return localStorage.getItem('logged_in') === 'true' || document.cookie.split('; ').some(c => c.startsWith('logged_in='));
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  localStorage.setItem('logged_in', 'true');
  return res.json();
}

export async function register(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }
  localStorage.setItem('logged_in', 'true');
  return res.json();
}

/**
 * Logout: gọi server để clear httpOnly jwt cookie, rồi xóa logged_in cookie
 * phía client. Dispatch custom event để App.tsx có thể re-render ngay lập tức.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Dù server có lỗi, vẫn xóa cookie phía client
  }
  // Xóa logged_in cookie phía client
  document.cookie = 'logged_in=; Max-Age=0; path=/';
  localStorage.removeItem('logged_in');
  // Notify App.tsx để re-render về login page
  window.dispatchEvent(new Event('app:logout'));
}