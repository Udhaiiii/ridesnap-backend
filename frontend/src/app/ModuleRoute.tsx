import { Suspense, type ReactNode } from 'react';
import type { Role } from '@/features/auth/authStore';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { ModuleLayout } from '@/shared/layouts/ModuleLayout';

function ModuleLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center font-rs-mono text-sm text-rs-sub">
      Loading module…
    </div>
  );
}

interface ModuleRouteProps {
  pageName: string;
  roles?: Role[];
  children: ReactNode;
}

/** Auth gate + lazy-load shell + back link to staff portal. */
export function ModuleRoute({ pageName, roles, children }: ModuleRouteProps) {
  return (
    <ProtectedRoute roles={roles}>
      <Suspense fallback={<ModuleLoading />}>
        <ModuleLayout pageName={pageName}>{children}</ModuleLayout>
      </Suspense>
    </ProtectedRoute>
  );
}
