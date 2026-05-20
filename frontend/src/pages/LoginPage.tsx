import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  photographer: '/photographer',
  counter: '/photo-desk',
  print: '/print',
};

export default function LoginPage() {
  const { user, login } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={ROLE_HOME[user.role] ?? '/'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      const role = localStorage.getItem('rs_role') ?? 'admin';
      navigate(ROLE_HOME[role] ?? '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="card"
        style={{ width: '100%', maxWidth: 400 }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--accent)',
            marginBottom: 8,
          }}
        >
          📸 RideSnap
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 12 }}>
          Staff login
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Username</span>
          <input
            className="input"
            style={{ marginTop: 6 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 24 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Password</span>
          <input
            className="input"
            type="password"
            style={{ marginTop: 6 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
