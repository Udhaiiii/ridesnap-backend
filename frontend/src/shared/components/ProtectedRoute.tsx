import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '@/features/auth/authStore';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, verify, hydrate, offline } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    void verify().finally(() => setReady(true));
  }, [hydrate, verify]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rs-bg font-rs-mono text-sm text-rs-sub">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && user.role !== 'admin' && !roles.includes(user.role)) {
    return <Navigate to="/login?reason=unauthorized" replace />;
  }

  return (
    <>
      {offline && (
        <div
          className="alert alert-error"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 300,
            margin: 0,
            borderRadius: 0,
            textAlign: 'center',
          }}
        >
          Offline mode — using cached session. Reconnect to verify permissions.
        </div>
      )}
      {children}
    </>
  );
}
