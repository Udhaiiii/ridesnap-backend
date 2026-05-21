import { Link } from 'react-router-dom';
import type { PortalModule } from '@/shared/config/portalModules';

const accentHover: Record<PortalModule['accent'], string> = {
  amber:
    'hover:border-amber-400/60 hover:shadow-[0_20px_60px_rgba(251,191,36,.18),0_0_0_1px_rgba(251,191,36,.1)]',
  green:
    'hover:border-emerald-400/60 hover:shadow-[0_20px_60px_rgba(52,211,153,.18),0_0_0_1px_rgba(52,211,153,.1)]',
  blue:
    'hover:border-blue-400/60 hover:shadow-[0_20px_60px_rgba(96,165,250,.18),0_0_0_1px_rgba(96,165,250,.1)]',
  violet:
    'hover:border-violet-400/60 hover:shadow-[0_20px_60px_rgba(167,139,250,.18),0_0_0_1px_rgba(167,139,250,.1)]',
  rose:
    'hover:border-rose-400/60 hover:shadow-[0_20px_60px_rgba(251,113,133,.18),0_0_0_1px_rgba(251,113,133,.1)]',
};

const roleColor: Record<PortalModule['accent'], string> = {
  amber: 'text-rs-amber',
  green: 'text-rs-green',
  blue: 'text-blue-400',
  violet: 'text-violet-400',
  rose: 'text-rs-rose',
};

const iconBg: Record<PortalModule['accent'], string> = {
  amber: 'bg-amber-400/18 shadow-[0_0_20px_rgba(251,191,36,.15)]',
  green: 'bg-emerald-400/18 shadow-[0_0_20px_rgba(52,211,153,.15)]',
  blue: 'bg-blue-400/18 shadow-[0_0_20px_rgba(96,165,250,.15)]',
  violet: 'bg-violet-400/18 shadow-[0_0_20px_rgba(167,139,250,.15)]',
  rose: 'bg-rose-400/18 shadow-[0_0_20px_rgba(251,113,133,.15)]',
};

const arrowStyle: Record<PortalModule['accent'], string> = {
  amber: 'text-rs-amber border-amber-500/30',
  green: 'text-rs-green border-emerald-500/30',
  blue: 'text-blue-400 border-blue-500/30',
  violet: 'text-violet-400 border-violet-500/30',
  rose: 'text-rs-rose border-rose-500/30',
};

interface Props {
  module: PortalModule;
  delayClass?: string;
}

export function PortalModuleCard({ module: mod, delayClass = '' }: Props) {
  if (mod.featured) {
    return (
      <Link
        to={mod.href}
        className={`group relative col-span-2 flex flex-row items-center gap-8 overflow-hidden rounded-[20px] border border-rs-border2 bg-gradient-to-br from-rs-surf2 to-rs-surf p-7 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,.4)] max-[900px]:col-span-1 max-[900px]:flex-col ${accentHover[mod.accent]} ${delayClass}`}
      >
        <div
          className={`flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-[20px] text-6xl ${iconBg[mod.accent]}`}
        >
          {mod.icon}
        </div>
        <div className="flex flex-1 flex-col">
          <div
            className={`mb-1.5 text-[10px] font-semibold uppercase tracking-[3px] ${roleColor[mod.accent]}`}
          >
            {mod.roleLabel}
          </div>
          <div className="mb-2.5 font-rs-display text-[38px] leading-none tracking-wide text-[#e8eaf2]">
            {mod.title}
          </div>
          <p className="mb-6 flex-1 text-[13px] leading-relaxed text-[#8a96b0]">
            {mod.description}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-rs-border pt-4">
            <span className="font-rs-mono text-[10px] tracking-wide text-rs-sub">
              {mod.tag}
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${arrowStyle[mod.accent]}`}
            >
              →
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={mod.href}
      className={`group relative flex flex-col overflow-hidden rounded-[20px] border border-rs-border2 bg-gradient-to-br from-rs-surf2 to-rs-surf p-7 text-inherit no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,.4)] ${accentHover[mod.accent]} ${delayClass}`}
    >
      <div
        className={`mb-5 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] text-2xl ${iconBg[mod.accent]}`}
      >
        {mod.icon}
      </div>
      <div
        className={`mb-1.5 text-[10px] font-semibold uppercase tracking-[3px] ${roleColor[mod.accent]}`}
      >
        {mod.roleLabel}
      </div>
      <div className="mb-2.5 font-rs-display text-[28px] leading-none tracking-wide text-[#e8eaf2]">
        {mod.title}
      </div>
      <p className="mb-6 flex-1 text-[13px] leading-relaxed text-[#8a96b0]">
        {mod.description}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-rs-border pt-4">
        <span className="font-rs-mono text-[10px] tracking-wide text-rs-sub">
          {mod.tag}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${arrowStyle[mod.accent]}`}
        >
          →
        </span>
      </div>
    </Link>
  );
}
