import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

export default function LoginPage() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter username and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-rs-bg px-5 font-rs-body text-rs-text"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,191,36,.1), transparent), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(96,165,250,.07), transparent)',
      }}
    >
      <div className="w-full max-w-[400px] animate-fade-up">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-[18px] bg-rs-amber text-[30px] shadow-[0_8px_32px_rgba(251,191,36,.3)]">
            📸
          </div>
          <div className="font-rs-display text-4xl tracking-[3px]">
            RIDE<span className="text-rs-amber">SNAP</span>
          </div>
          <div className="mt-1 text-xs uppercase tracking-[2px] text-rs-sub">
            Staff Portal
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-[20px] border border-rs-border bg-rs-surf px-7 py-8 shadow-[0_20px_60px_rgba(0,0,0,.4)]"
        >
          <div className="mb-1 font-rs-display text-[22px] tracking-wide">
            Welcome Back
          </div>
          <p className="mb-7 text-xs text-rs-sub">
            Sign in with your staff credentials
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rs-rose">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <label className="mb-[18px] block">
            <span className="mb-2 block text-[11px] uppercase tracking-[1.5px] text-rs-sub">
              Username
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base">
                👤
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter username"
                className="w-full rounded-xl border border-rs-border bg-rs-surf2 py-3 pl-10 pr-3.5 font-rs-mono text-sm text-rs-text outline-none transition-[border,box-shadow] placeholder:text-[#3a4258] focus:border-rs-amber focus:shadow-[0_0_0_3px_rgba(251,191,36,.12)]"
              />
            </div>
          </label>

          <label className="mb-2 block">
            <span className="mb-2 block text-[11px] uppercase tracking-[1.5px] text-rs-sub">
              Password
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base">
                🔑
              </span>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full rounded-xl border border-rs-border bg-rs-surf2 py-3 pl-10 pr-10 font-rs-mono text-sm text-rs-text outline-none transition-[border,box-shadow] placeholder:text-[#3a4258] focus:border-rs-amber focus:shadow-[0_0_0_3px_rgba(251,191,36,.12)]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 text-sm text-rs-sub hover:text-rs-text"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                👁
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-rs-amber py-3.5 font-rs-display text-lg tracking-[2px] text-rs-bg transition-all hover:-translate-y-px hover:bg-[#fcd34d] hover:shadow-[0_8px_24px_rgba(251,191,36,.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? 'Signing in...' : 'Login →'}
          </button>
        </form>

        <p className="mt-7 text-center text-[11px] text-rs-sub">
          RideSnap <span className="text-rs-amber">Park Photo System</span> · Staff
          access only
        </p>
      </div>
    </div>
  );
}
