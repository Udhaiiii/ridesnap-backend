import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { UserBar } from '@/shared/components/UserBar';

interface ModuleLayoutProps {
  children: ReactNode;
  pageName: string;
}

export function ModuleLayout({ children, pageName }: ModuleLayoutProps) {
  return (
    <div className="min-h-screen bg-rs-bg font-rs-body text-rs-text pb-16">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
        }}
        aria-hidden
      />
      <div className="relative z-[1] mx-auto max-w-[1200px] px-5 py-6">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 font-rs-mono text-[11px] tracking-wide text-rs-sub no-underline transition-colors hover:text-rs-amber"
        >
          ← Staff Portal
        </Link>
        {children}
      </div>
      <UserBar pageName={pageName} />
    </div>
  );
}
