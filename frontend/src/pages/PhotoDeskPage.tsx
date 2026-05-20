import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { UserBar } from '@/components/UserBar';

interface Photo {
  id: string;
  ride_name: string;
  s3_url: string | null;
  status: string;
}

interface Config {
  prices: Record<string, number>;
  payment: { upi_id: string; upi_name: string };
}

export default function PhotoDeskPage() {
  const [wbId, setWbId] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orderType, setOrderType] = useState('digital');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void api<Config & { success: boolean }>('/config').then(setConfig);
  }, []);

  async function lookup() {
    const d = await api<{ photos: Photo[] }>(`/visits/${wbId.toUpperCase()}`);
    setPhotos(d.photos);
    setSelected(new Set());
  }

  async function placeOrder() {
    const ids = [...selected];
    if (!ids.length) return;
    const endpoint = ids.length > 1 ? '/orders/bulk' : '/orders';
    const body =
      ids.length > 1
        ? { visit_id: wbId.toUpperCase(), photo_ids: ids, order_type: orderType, email }
        : { visit_id: wbId.toUpperCase(), photo_id: ids[0], order_type: orderType, email };
    const d = await api<{ message: string; order?: { id: string }; orders?: { id: string }[] }>(
      endpoint,
      { method: 'POST', body: JSON.stringify(body) },
    );
    setMsg(d.message);
    const orderId = d.order?.id ?? d.orders?.[0]?.id;
    if (orderId) window.open(`/receipt/${orderId}`, '_blank');
    void lookup();
  }

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>🖥️ Photo Desk</h1>
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="WB-0001"
              value={wbId}
              onChange={(e) => setWbId(e.target.value)}
            />
            <button className="btn" type="button" onClick={() => void lookup()}>
              Lookup
            </button>
          </div>
        </div>
        {config && (
          <div className="card" style={{ marginBottom: 20 }}>
            <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>Package</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {Object.entries(config.prices).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  className={orderType === k ? 'btn' : 'btn-ghost'}
                  onClick={() => setOrderType(k)}
                >
                  {k} ₹{v}
                </button>
              ))}
            </div>
            <input
              className="input"
              placeholder="Guest email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <button className="btn" type="button" onClick={() => void placeOrder()} disabled={!selected.size}>
              Place Order ({selected.size})
            </button>
            {msg && <p style={{ marginTop: 12, color: 'var(--success)', fontSize: 12 }}>{msg}</p>}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
          {photos.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: selected.has(p.id) ? 'var(--accent)' : undefined,
              }}
              onClick={() => {
                const next = new Set(selected);
                if (next.has(p.id)) next.delete(p.id);
                else next.add(p.id);
                setSelected(next);
              }}
            >
              {p.s3_url && <img src={p.s3_url} alt="" style={{ width: '100%', borderRadius: 8 }} />}
              <p style={{ marginTop: 8, fontSize: 11 }}>{p.ride_name}</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{p.status}</p>
            </div>
          ))}
        </div>
      </div>
      <UserBar pageName="Photo Desk" />
    </>
  );
}
