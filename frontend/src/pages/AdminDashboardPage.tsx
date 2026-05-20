import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { UserBar } from '@/components/UserBar';

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

interface Stats {
  guests_today: number;
  photos_today: number;
  orders_today: number;
  revenue_today: number;
  pending_prints: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rideForm, setRideForm] = useState({ id: '', name: '', emoji: '🎢' });
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'counter', name: '' });

  const load = async () => {
    const [s, r, u] = await Promise.all([
      api<{ stats: Stats }>('/stats'),
      api<{ rides: Ride[] }>('/rides'),
      api<{ users: User[] }>('/users'),
    ]);
    setStats(s.stats);
    setRides(r.rides);
    setUsers(u.users);
  };

  useEffect(() => {
    void load();
  }, []);

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

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>👑 Admin</h1>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <Link to="/bulk-qr" className="btn">Bulk QR Printer</Link>
          <Link to="/reports" className="btn-ghost">Financial Report</Link>
        </div>
        {stats && (
          <div className="grid-stats" style={{ marginBottom: 24 }}>
            <div className="stat-box"><div className="label">Revenue</div><div className="value">₹{stats.revenue_today}</div></div>
            <div className="stat-box"><div className="label">Orders</div><div className="value">{stats.orders_today}</div></div>
            <div className="stat-box"><div className="label">Photos</div><div className="value">{stats.photos_today}</div></div>
            <div className="stat-box"><div className="label">Prints</div><div className="value">{stats.pending_prints}</div></div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Rides</h2>
            <form onSubmit={(e) => void addRide(e)} style={{ marginBottom: 16 }}>
              <input className="input" placeholder="ID e.g. R06" value={rideForm.id} onChange={(e) => setRideForm({ ...rideForm, id: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="input" placeholder="Name" value={rideForm.name} onChange={(e) => setRideForm({ ...rideForm, name: e.target.value })} style={{ marginBottom: 8 }} />
              <button className="btn" type="submit">Add Ride</button>
            </form>
            {rides.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{r.emoji} {r.name} ({r.id})</span>
                <button type="button" className="btn-ghost" onClick={() => void deleteRide(r.id)}>Delete</button>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Users</h2>
            <form onSubmit={(e) => void addUser(e)} style={{ marginBottom: 16 }}>
              <input className="input" placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="input" type="password" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} style={{ marginBottom: 8 }} />
              <select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} style={{ marginBottom: 8 }}>
                <option value="admin">admin</option>
                <option value="photographer">photographer</option>
                <option value="counter">counter</option>
                <option value="print">print</option>
              </select>
              <button className="btn" type="submit">Add User</button>
            </form>
            {users.map((u) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{u.name} · {u.username} · {u.role}</span>
                <button type="button" className="btn-ghost" onClick={() => void deleteUser(u.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <UserBar pageName="Admin" />
    </>
  );
}
