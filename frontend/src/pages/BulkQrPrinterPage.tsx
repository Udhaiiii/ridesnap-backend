import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { UserBar } from '@/components/UserBar';

export default function BulkQrPrinterPage() {
  const [quantity, setQuantity] = useState(10);
  const [prefix, setPrefix] = useState('WB');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<{ next_from: number; message: string } | null>(null);
  const [lastIds, setLastIds] = useState<string[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    void api<{ next_from: number; message: string }>('/wristbands/today-status').then(setStatus);
  }, []);

  async function generate() {
    const d = await api<{ from: string; to: string; count: number }>('/wristbands/generate', {
      method: 'POST',
      body: JSON.stringify({ quantity, prefix, label: label || undefined }),
    });
    const ids: string[] = [];
    const fromNum = parseInt(d.from.split('-').pop() ?? '0', 10);
    for (let i = 0; i < d.count; i++) {
      ids.push(`${prefix}-${String(fromNum + i).padStart(4, '0')}`);
    }
    setLastIds(ids);
    setMsg(`Registered ${d.from} → ${d.to}`);
    void api<{ next_from: number; message: string }>('/wristbands/today-status').then(setStatus);
  }

  async function printAll() {
    if (!lastIds.length) return;
    const d = await api<{ message: string }>('/print/wristbands', {
      method: 'POST',
      body: JSON.stringify({ ids: lastIds }),
    });
    setMsg(d.message);
  }

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>🏷️ Bulk QR Printer</h1>
        {status && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            {status.message} · Next: #{status.next_from}
          </div>
        )}
        <div className="card" style={{ maxWidth: 480 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Quantity
            <input
              type="number"
              className="input"
              style={{ marginTop: 6 }}
              value={quantity}
              min={1}
              max={2000}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Prefix
            <input className="input" style={{ marginTop: 6 }} value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </label>
          <label style={{ display: 'block', marginBottom: 20 }}>
            Batch label (optional)
            <input className="input" style={{ marginTop: 6 }} value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={() => void generate()}>
              Generate Batch
            </button>
            <button type="button" className="btn-ghost" disabled={!lastIds.length} onClick={() => void printAll()}>
              Print to Zebra
            </button>
          </div>
          {msg && <p style={{ marginTop: 16, fontSize: 12, color: 'var(--success)' }}>{msg}</p>}
        </div>
      </div>
      <UserBar pageName="Bulk QR" />
    </>
  );
}
