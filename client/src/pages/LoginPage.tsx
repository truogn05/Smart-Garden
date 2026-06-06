import { useState } from 'react';
import { Leaf, Eye, EyeOff, Cloud, Globe } from 'lucide-react';
import { login, register } from '../hooks/useAuth';

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Layer: Botanical Canvas */}
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover opacity-80"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWuDWhtJjMXOpyU-cya4ETCOHS3XAL9vx6R-PeO7NMCQSlo5jVdBZT2FbLvbYG7m4qC6AvnKJoVv_FKX_0lwPmqtrcCOAk3n3TmkMAo6PYc69TTUGmC6jWuR4Ooy4FrUI-KnvOjdGX2rDJHc_tLnzHqi-4XlWr8_SH0q7-K4H4P_BOqUbBnyBoJfEEGRUzAb2YyPCtASUjCJ9qZF0kyDGKWLDQwvcn0JTpzLCP2P5rCW8vWmfJknO2IgJaR9umhlhhcSIj4ZBksXjN"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-surface/40 via-transparent to-surface-container-low/30" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 md:px-12">
        <div className="w-full max-w-md">
          {/* Glass Login Card */}
          <div className="glass-panel backdrop-blur-[20px] bg-surface/60 border border-surface-container-highest/50 rounded-xl shadow-[0_30px_60px_-15px_rgba(23,49,36,0.1)] p-8 md:p-12 transition-all duration-500">
            {/* Brand Identity */}
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Leaf className="text-on-primary" size={32} />
              </div>
              <h1 className="font-headline-lg text-headline-lg text-primary text-center mb-2">Verdant IoT</h1>
              <p className="font-body-md text-body-md text-on-surface-variant text-center italic">
                "Welcome to your garden. Tend with intention."
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest ml-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@garden.io"
                    required
                    autoComplete="email"
                    className="w-full pl-4 pr-4 py-4 bg-surface/40 border-b-2 border-outline-variant focus:border-primary focus:bg-surface-container-low/60 rounded-t-lg outline-none transition-all duration-300 font-body-md placeholder:text-outline/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest ml-1" htmlFor="password">
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-4 pr-12 py-4 bg-surface/40 border-b-2 border-outline-variant focus:border-primary focus:bg-surface-container-low/60 rounded-t-lg outline-none transition-all duration-300 font-body-md placeholder:text-outline/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 bg-transparent" />
                  <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">Keep me rooted</span>
                </label>
                <a href="#" className="font-label-md text-label-md text-secondary hover:text-on-secondary-container transition-colors underline-offset-4 hover:underline">
                  Forgot?
                </a>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-error-container/30 border border-error/30 rounded-lg px-4 py-3">
                  <p className="font-body-md text-body-md text-on-error-container">{error}</p>
                </div>
              )}

              {/* Submit */}
              <div className="pt-4 space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-on-primary py-4 rounded-full font-label-md shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-widest disabled:opacity-60"
                >
                  {loading ? 'Please wait…' : mode === 'login' ? 'Enter Greenhouse' : 'Create Access'}
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="flex-grow border-t border-outline-variant/30" />
                  <span className="flex-shrink mx-4 font-label-md text-label-md text-outline/60 uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-outline-variant/30" />
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest border border-outline-variant/50 text-on-surface py-4 rounded-full font-label-md hover:bg-surface-container-high hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 uppercase tracking-widest"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Google Sign In</span>
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-outline-variant/20 text-center">
              <p className="font-label-md text-label-md text-on-surface-variant">
                {mode === 'login' ? (
                  <>New to the ecosystem?{' '}
                    <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-primary font-bold hover:text-secondary ml-1 transition-colors">
                      Apply for Access
                    </button>
                  </>
                ) : (
                  <>Already have access?{' '}
                    <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-primary font-bold hover:text-secondary ml-1 transition-colors">
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Status Chips */}
          <div className="mt-8 flex justify-center gap-4">
            <div className="bg-surface-container-low/60 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/30 flex items-center gap-2">
              <Cloud size={14} className="text-primary" />
              <span className="font-label-md text-label-md text-on-surface-variant">Systems Nominal</span>
            </div>
            <div className="bg-surface-container-low/60 backdrop-blur-md px-4 py-2 rounded-full border border-outline-variant/30 flex items-center gap-2">
              <Globe size={14} className="text-secondary" />
              <span className="font-label-md text-label-md text-on-surface-variant">v2.4.1 Botanical</span>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Help */}
      <div className="fixed bottom-8 right-8 z-20">
        <button className="w-14 h-14 bg-surface/80 backdrop-blur-xl border border-outline-variant/30 rounded-full flex items-center justify-center text-primary shadow-lg hover:scale-110 active:scale-95 transition-all">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>
    </div>
  );
}
