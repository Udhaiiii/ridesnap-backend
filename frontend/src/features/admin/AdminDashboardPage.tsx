import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { formatInr, formatTime, pkgLabel } from '@/shared/lib/format';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { UserBar } from '@/shared/components/UserBar';
import { usePolling } from '@/shared/hooks/usePolling';
import type { DashboardStats } from '@/shared/types/api';

interface Ride {
  id: string;
  name: string;
  emoji: string | null;
}

interface User {
  id: string;
  username: string;
  role: string;
  name: string | null;
  active: boolean;
}

interface QueueItem {
  id: string;
  guest_name: string | null;
  status: string;
  ride_name: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rideForm, setRideForm] = useState({ id: '', name: '', emoji: '🎢' });
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'counter', name: '' });
  const [editRide, setEditRide] = useState<Ride | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRideForm, setEditRideForm] = useState({ name: '', emoji: '🎢' });
  const [editUserForm, setEditUserForm] = useState({ name: '', role: 'counter', password: '' });

  const load = useCallback(async () => {
    const [s, r, u, pq] = await Promise.all([
      api<{ stats: DashboardStats }>('/stats'),
      api<{ rides: Ride[] }>('/rides'),
      api<{ users: User[] }>('/users'),
      api<{ queue: QueueItem[] }>('/print-queue?status=queued,printing'),
    ]);
    setStats(s.stats);
    setRides(r.rides);
    setUsers(u.users);
    setQueue(pq.queue.slice(0, 6));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  usePolling(() => load(), 60_000);

  async function addRide(e: FormEvent) {
    e.preventDefault();
    await api('/rides', { method: 'POST', body: JSON.stringify(rideForm) });
    setRideForm({ id: '', name: '', emoji: '🎢' });
    void load();
  }

  async function addUser(e: FormEvent) {
    e.preventDefault();
    await api('/users', { method: 'POST', body: JSON.stringify(userForm) });
    setUserForm({ username: '', password: '', role: 'counter', name: '' });
    void load();
  }

  async function saveRide() {
    if (!editRide) return;
    await api(`/rides/${editRide.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: editRideForm.name, emoji: editRideForm.emoji }),
    });
    setEditRide(null);
    void load();
  }

  async function saveUser() {
    if (!editUser) return;
    const body: Record<string, string | number> = {
      name: editUserForm.name,
      role: editUserForm.role,
    };
    if (editUserForm.password) body.password = editUserForm.password;
    await api(`/users/${editUser.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    setEditUser(null);
    void load();
  }

  async function toggleUserActive(u: User) {
    await api(`/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: u.active ? 0 : 1 }),
    });
    void load();
  }

  async function deleteRide(id: string) {
    if (!confirm(`Delete ride ${id}?`)) return;
    await api(`/rides/${id}`, { method: 'DELETE' });
    void load();
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete user?')) return;
    await api(`/users/${id}`, { method: 'DELETE' });
    void load();
  }

  const maxHour = stats
    ? Math.max(...stats.hourly_revenue.map((h) => h.revenue), 1)
    : 1;

  return (
    <>
      <div className="page">
        <PageHeader
          title="👑 Admin Dashboard"
          subtitle="Live ops · refreshes every 60s"
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to="/bulk-qr" className="btn">
                Bulk QR
              </Link>
              <Link to="/reports" className="btn-ghost">
                Reports
              </Link>
              <Link to="/print" className="btn-ghost">
                Print Queue
              </Link>
            </div>
          }
        />

        {stats && (
          <>
            <div className="grid-stats" style={{ marginBottom: 24 }}>
              <div className="stat-box">
                <div className="label">Revenue</div>
                <div className="value">{formatInr(stats.revenue_today)}</div>
              </div>
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
                <div className="label">Pending prints</div>
                <div className="value">{stats.pending_prints}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="card">
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>Packages today</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    ['Digital', stats.digital_orders, '📱'],
                    ['Print', stats.print_orders, '🖨️'],
                    ['Frame', stats.frame_orders, '🖼️'],
                    ['Combo', stats.combo_orders, '⭐'],
                  ].map(([label, n, icon]) => (
                    <div key={String(label)} style={{ flex: '1 1 40%', minWidth: 100 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {icon} {label}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{n}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>Revenue by hour</h2>
                {stats.hourly_revenue.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>No orders yet</p>
                ) : (
                  stats.hourly_revenue.map((h) => (
                    <div key={h.hour} className="bar-row">
                      <div className="bar-label">{h.hour}</div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${Math.round((h.revenue / maxHour) * 100)}%` }}
                        >
                          {h.orders}
                        </div>
                      </div>
                      <div className="bar-amt">{formatInr(h.revenue)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div className="card">
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>Recent orders</h2>
                {stats.recent_orders.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>No orders yet</p>
                ) : (
                  stats.recent_orders.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 12,
                      }}
                    >
                      <span>
                        {o.guest_name || 'Guest'} · {pkgLabel(o.order_type)}
                      </span>
                      <span>
                        {formatInr(o.price)} · {formatTime(o.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="card">
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>Print queue (active)</h2>
                {queue.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Queue empty</p>
                ) : (
                  queue.map((q) => (
                    <div
                      key={q.id}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 12,
                      }}
                    >
                      {q.guest_name ?? 'Guest'} · {q.ride_name} · <strong>{q.status}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            {stats.rides_stats.length > 0 && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>Ride performance</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ride</th>
                        <th>Photos</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.rides_stats.map((r) => (
                        <tr key={r.ride_id}>
                          <td>{r.ride_name}</td>
                          <td>{r.photos}</td>
                          <td>{r.orders}</td>
                          <td>{formatInr(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Rides</h2>
            <form onSubmit={(e) => void addRide(e)} style={{ marginBottom: 16 }}>
              <input
                className="input"
                placeholder="ID e.g. R06"
                value={rideForm.id}
                onChange={(e) => setRideForm({ ...rideForm, id: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <input
                className="input"
                placeholder="Name"
                value={rideForm.name}
                onChange={(e) => setRideForm({ ...rideForm, name: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <button className="btn" type="submit">
                Add Ride
              </button>
            </form>
            {rides.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span>
                  {r.emoji} {r.name} ({r.id})
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditRide(r);
                      setEditRideForm({ name: r.name, emoji: r.emoji ?? '🎢' });
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => void deleteRide(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Users</h2>
            <form onSubmit={(e) => void addUser(e)} style={{ marginBottom: 16 }}>
              <input
                className="input"
                placeholder="Username"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                style={{ marginBottom: 8 }}
              />
              <select
                className="input"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                style={{ marginBottom: 8 }}
              >
                <option value="admin">admin</option>
                <option value="photographer">photographer</option>
                <option value="counter">counter</option>
                <option value="print">print</option>
              </select>
              <button className="btn" type="submit">
                Add User
              </button>
            </form>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  opacity: u.active ? 1 : 0.5,
                }}
              >
                <span>
                  {u.name} · {u.username} · {u.role}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-ghost" onClick={() => void toggleUserActive(u)}>
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditUser(u);
                      setEditUserForm({ name: u.name ?? '', role: u.role, password: '' });
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => void deleteUser(u.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!editRide} onClose={() => setEditRide(null)} title="Edit ride">
        <input
          className="input"
          value={editRideForm.name}
          onChange={(e) => setEditRideForm({ ...editRideForm, name: e.target.value })}
          style={{ marginBottom: 8 }}
        />
        <input
          className="input"
          value={editRideForm.emoji}
          onChange={(e) => setEditRideForm({ ...editRideForm, emoji: e.target.value })}
          style={{ marginBottom: 16 }}
        />
        <button type="button" className="btn" onClick={() => void saveRide()}>
          Save
        </button>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit user">
        <input
          className="input"
          value={editUserForm.name}
          onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
          style={{ marginBottom: 8 }}
        />
        <select
          className="input"
          value={editUserForm.role}
          onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
          style={{ marginBottom: 8 }}
        >
          <option value="admin">admin</option>
          <option value="photographer">photographer</option>
          <option value="counter">counter</option>
          <option value="print">print</option>
        </select>
        <input
          className="input"
          type="password"
          placeholder="New password (optional)"
          value={editUserForm.password}
          onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
          style={{ marginBottom: 16 }}
        />
        <button type="button" className="btn" onClick={() => void saveUser()}>
          Save
        </button>
      </Modal>

      <UserBar pageName="Admin" />
    </>
  );
}
