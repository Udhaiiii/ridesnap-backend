import { useEffect, useState } from 'react';
import { api } from '@/shared/api/client';
import { PortalModuleCard } from '@/shared/components/PortalModuleCard';
import {
  PORTAL_MODULES,
  isPortalCardVisible,
} from '@/shared/config/portalModules';
import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber';
import { useAuthStore } from '@/features/auth/authStore';
import { PortalShell } from '@/shared/layouts/PortalShell';

interface Stats {
  guests_today: number;
  photos_today: number;
  orders_today: number;
  revenue_today: number;
  pending_prints: number;
}

function StatCell({
  label,
  value,
  animated,
}: {
  label: string;
  value: string | number;
  animated?: number;
}) {
  const n = useAnimatedNumber(animated ?? 0);
  const display =
    animated !== undefined ? (animated === 0 ? '0' : String(n)) : value;

  return (
    <div className="flex-1 border-r border-rs-border px-5 py-[18px] text-center transition-colors last:border-r-0 hover:bg-rs-surf2">
      <div className="mb-1 font-rs-display text-[32px] leading-none text-rs-amber">
        {display}
      </div>
      <div className="text-[10px] uppercase tracking-[2px] text-rs-sub">
        {label}
      </div>
    </div>
  );
}

export default function StaffPortalPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const footerDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    void api<{ stats: Stats }>('/stats')
      .then((d) => {
        setStats(d.stats);
        setServerOnline(true);
      })
      .catch(() => setServerOnline(false));

    const id = window.setInterval(() => {
      void api<{ stats: Stats }>('/stats')
        .then((d) => {
          setStats(d.stats);
          setServerOnline(true);
        })
        .catch(() => setServerOnline(false));
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const visibleModules = PORTAL_MODULES.filter((m) =>
    user ? isPortalCardVisible(user.role, m.id) : false,
  );

  const delayClasses = [
    'animate-fade-up [animation-delay:100ms]',
    'animate-fade-up [animation-delay:150ms]',
    'animate-fade-up [animation-delay:200ms]',
    'animate-fade-up [animation-delay:250ms]',
    'animate-fade-up [animation-delay:300ms]',
    'animate-fade-up [animation-delay:350ms]',
    'animate-fade-up [animation-delay:400ms]',
  ];

  return (
    <PortalShell serverOnline={serverOnline}>
      <section className="flex min-h-[52vh] flex-col items-center justify-center px-6 py-[60px] pb-10 text-center">
        <div className="animate-fade-up mb-6 flex items-center gap-2.5 font-rs-mono text-[11px] uppercase tracking-[4px] text-rs-amber [animation-delay:100ms]">
          <span className="h-px w-8 bg-rs-amber" />
          Staff Portal
          <span className="h-px w-8 bg-rs-amber" />
        </div>
        <h1 className="animate-fade-up font-rs-display text-[clamp(72px,12vw,160px)] leading-[0.92] tracking-wide [animation-delay:200ms]">
          <span className="block text-rs-text">Welcome to</span>
          <span
            className="block text-transparent"
            style={{
              WebkitTextStroke: '2px #fbbf24',
              textShadow: '0 0 80px rgba(251,191,36,.3)',
            }}
          >
            RideSnap
          </span>
        </h1>
        <p className="animate-fade-up mb-10 max-w-[420px] text-[15px] leading-relaxed text-[#9ba8c0] [animation-delay:300ms]">
          Amusement Park Photo System · Select your role to get started
        </p>

        <div className="animate-fade-up mx-auto mb-16 flex w-full max-w-[700px] overflow-hidden rounded-2xl border border-rs-border2 bg-rs-surf shadow-[0_0_40px_rgba(251,191,36,.06)] [animation-delay:400ms]">
          {stats ? (
            <>
              <StatCell
                label="Guests Today"
                value=""
                animated={stats.guests_today}
              />
              <StatCell label="Photos" value="" animated={stats.photos_today} />
              <StatCell label="Orders" value="" animated={stats.orders_today} />
              <StatCell
                label="Revenue"
                value={`₹${(stats.revenue_today || 0).toLocaleString('en-IN')}`}
              />
              <StatCell
                label="Pending Prints"
                value=""
                animated={stats.pending_prints}
              />
            </>
          ) : (
            ['Guests Today', 'Photos', 'Orders', 'Revenue', 'Pending Prints'].map(
              (lbl) => (
                <StatCell key={lbl} label={lbl} value="—" />
              ),
            )
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 pb-20">
        <div className="mb-7 flex items-center gap-3.5">
          <h2 className="font-rs-display text-[28px] tracking-wide text-[#4a5270]">
            Choose Your Role
          </h2>
          <div className="h-px flex-1 bg-rs-border" />
        </div>

        <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {visibleModules.map((mod, i) => (
            <PortalModuleCard
              key={mod.id}
              module={mod}
              delayClass={delayClasses[i] ?? 'animate-fade-up'}
            />
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between border-t border-rs-border px-8 py-5 font-rs-mono text-[11px] text-rs-sub">
        <div>
          RideSnap <span className="text-rs-amber">Park Photo System</span> · All
          rights reserved
        </div>
        <div>{footerDate}</div>
      </footer>
    </PortalShell>
  );
}
