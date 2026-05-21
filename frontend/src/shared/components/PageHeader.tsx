import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 font-rs-display text-3xl tracking-wide text-rs-text">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[11px] text-rs-sub">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
