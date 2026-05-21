import { useCallback, useEffect, useState } from 'react';
import { api } from '@/shared/api/client';

interface QueueItem {
  id: string;
  guest_name: string | null;
  ride_name: string;
  status: string;
  s3_url: string | null;
  print_size: string;
}

export default function PrintDashboardPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    const q = filter === 'all' ? '' : `?status=${filter}`;
    const d = await api<{ queue: QueueItem[]; badges: Record<string, number> }>(
      `/print-queue${q}`,
    );
    setQueue(d.queue);
    setBadges(d.badges);
  }, [filter]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(id: string, status: string) {
    await api(`/print-queue/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    void load();
  }

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>🖨️ Print Queue</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'queued', 'printing', 'done', 'collected'].map((s) => (
            <button
              key={s}
              type="button"
              className={filter === s ? 'btn' : 'btn-ghost'}
              onClick={() => setFilter(s)}
            >
              {s} ({badges[s] ?? 0})
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {queue.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {item.s3_url && (
                <img src={item.s3_url} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              )}
              <div style={{ flex: 1 }}>
                <strong>{item.guest_name ?? 'Guest'}</strong>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {item.ride_name} · {item.print_size} · {item.status}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {item.status === 'queued' && (
                  <button type="button" className="btn-ghost" onClick={() => void setStatus(item.id, 'printing')}>
                    Printing
                  </button>
                )}
                {item.status === 'printing' && (
                  <button type="button" className="btn" onClick={() => void setStatus(item.id, 'done')}>
                    Done
                  </button>
                )}
                {item.status === 'done' && (
                  <button type="button" className="btn" onClick={() => void setStatus(item.id, 'collected')}>
                    Collected
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
