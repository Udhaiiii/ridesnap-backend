import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { UserBar } from '@/shared/components/UserBar';
import { useAuthStore } from '@/features/auth/authStore';

interface Stats {
  guests_today: number;
  photos_today: number;
  orders_today: number;
  revenue_today: number;
  pending_prints: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    void api<{ stats: Stats }>('/stats').then((d) => setStats(d.stats));
    void api<{ success: boolean }>('/health')
      .then((d) => setApiOnline(d.success))
      .catch(() => setApiOnline(false));
  }, []);

  const links = [
    { to: '/photographer', label: '📷 Photographer', roles: ['photographer', 'admin'] },
    { to: '/photo-desk', label: '🖥️ Photo Desk', roles: ['counter', 'admin'] },
    { to: '/print', label: '🖨️ Print Queue', roles: ['print', 'admin'] },
    { to: '/admin', label: '👑 Admin', roles: ['admin'] },
    { to: '/bulk-qr', label: '🏷️ Bulk QR', roles: ['admin'] },
    { to: '/reports', label: '📊 Reports', roles: ['admin'] },
  ].filter((l) => !l.roles || l.roles.includes(user?.role ?? '') || user?.role === 'admin');

  return (
    <>
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, margin: 0 }}>
            RideSnap Dashboard
          </h1>
          {apiOnline !== null && (
            <span style={{ fontSize: 11, color: apiOnline ? 'var(--success)' : 'var(--danger)' }}>
              {apiOnline ? '● Server online' : '● Server offline'}
            </span>
          )}
        </div>
        {stats && (
          <div className="grid-stats" style={{ marginBottom: 32 }}>
            <div className="stat-box">
              <div className="label">Guests</div>
              <div className="value">{stats.guests_today}</div>
            </div>
            <div className="stat-box">
              <div className="label">Photos</div>
              <div className="value">{stats.photos_today}</div>
            </div>
            <div className="stat-box">
              <div className="label">Orders</div>
              <div className="value">{stats.orders_today}</div>
            </div>
            <div className="stat-box">
              <div className="label">Revenue</div>
              <div className="value">₹{stats.revenue_today}</div>
            </div>
            <div className="stat-box">
              <div className="label">Pending Prints</div>
              <div className="value">{stats.pending_prints}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="btn" style={{ display: 'inline-block' }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <UserBar pageName="Dashboard" />
    </>
  );
}
