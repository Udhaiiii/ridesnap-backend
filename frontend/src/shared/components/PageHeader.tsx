import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
