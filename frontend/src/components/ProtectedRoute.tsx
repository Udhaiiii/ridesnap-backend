import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, Role } from '@/store/authStore';

interface Props {
  children: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, verify, hydrate } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    void verify().finally(() => setReady(true));
  }, [hydrate, verify]);

  if (!ready) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && user.role !== 'admin' && !roles.includes(user.role)) {
    return <Navigate to="/login?reason=unauthorized" replace />;
  }

  return <>{children}</>;
}
