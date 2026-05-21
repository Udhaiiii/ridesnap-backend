import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { useLiveClock } from '@/shared/hooks/useLiveClock';

interface PortalShellProps {
  children: ReactNode;
  serverOnline: boolean | null;
}

export function PortalShell({ children, serverOnline }: PortalShellProps) {
  const { user, logout } = useAuthStore();
  const clock = useLiveClock();

  return (
    <div className="min-h-screen bg-rs-bg font-rs-body text-rs-text overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -top-[20vh] -left-[10vw] z-0 h-[70vh] w-[70vw]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(251,191,36,.13) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -bottom-[20vh] -right-[10vw] z-0 h-[60vh] w-[60vw]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(96,165,250,.10) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <header className="fixed top-0 left-0 right-0 z-[100] flex h-14 items-center justify-between border-b border-white/[0.04] bg-rs-bg/92 px-8 backdrop-blur-xl">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-rs-display text-[22px] tracking-[2px] text-rs-text no-underline"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rs-amber text-base">
            📸
          </span>
          RIDE<span className="text-rs-amber">SNAP</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-rs-mono text-[11px] text-[#666]">
            👤 {user?.name ?? '—'}
          </span>
          <span className="font-rs-mono text-[13px] tracking-wide text-rs-amber">
            {clock}
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="cursor-pointer rounded-lg border border-[#7f1d1d] bg-[#1a1a22] px-3.5 py-1.5 font-rs-mono text-[11px] text-[#f87171] transition-colors hover:bg-[#2a1a1a]"
          >
            ⏻ Logout
          </button>
          <div className="flex items-center gap-1.5 rounded-full border border-rs-border2 bg-rs-surf2 px-3.5 py-1.5 font-rs-mono text-[11px] text-rs-sub">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                serverOnline === false
                  ? 'bg-rs-rose shadow-[0_0_8px_#fb7185]'
                  : 'bg-rs-green shadow-[0_0_8px_#34d399] animate-pulse'
              }`}
            />
            {serverOnline === false ? 'Server Offline' : 'Server Online'}
          </div>
        </div>
      </header>

      <div className="relative z-[1] pt-14">{children}</div>
    </div>
  );
}
