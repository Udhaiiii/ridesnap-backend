import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '@/shared/api/client';

interface Batch {
  batch_label: string;
  batch_date: string;
  count: number;
  first_id: string;
  last_id: string;
}

function QrImg({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    void QRCode.toDataURL(text, { width: 90, margin: 1 }).then(setSrc);
  }, [text]);
  if (!src) return <div style={{ width: 90, height: 90, margin: '0 auto' }} />;
  return <img src={src} alt={text} />;
}

export default function BulkQrPrinterPage() {
  const [quantity, setQuantity] = useState(10);
  const [prefix, setPrefix] = useState('WB');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<{ next_from: number; total_today: number; message: string } | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [lastIds, setLastIds] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [printStatus, setPrintStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadStatus = useCallback(async () => {
    const d = await api<{ next_from: number; total_today: number; message: string }>(
      '/wristbands/today-status',
    );
    setStatus(d);
  }, []);

  const loadBatches = useCallback(async () => {
    const d = await api<{ batches: Batch[] }>('/wristbands/batches');
    setBatches((d.batches ?? []).filter((b) => b.batch_date === today));
  }, [today]);

  useEffect(() => {
    void loadStatus();
    void loadBatches();
  }, [loadStatus, loadBatches]);

  async function generate() {
    setBusy(true);
    setMsg('');
    try {
      const d = await api<{
        from: string;
        to: string;
        count: number;
        from_number: number;
        to_number: number;
      }>('/wristbands/generate', {
        method: 'POST',
        body: JSON.stringify({ quantity, prefix, label: label || undefined }),
      });
      const ids: string[] = [];
      for (let i = d.from_number; i <= d.to_number; i++) {
        ids.push(`${prefix}-${String(i).padStart(4, '0')}`);
      }
      setLastIds(ids);
      setMsg(`Registered ${d.from} → ${d.to} (${d.count} wristbands)`);
      await loadStatus();
      await loadBatches();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setBusy(false);
    }
  }

  async function printZebra() {
    if (!lastIds.length) return;
    setBusy(true);
    setPrintStatus('Sending to printer…');
    try {
      const d = await api<{ message: string; printed: number; failed: number }>(
        '/print/wristbands',
        { method: 'POST', body: JSON.stringify({ ids: lastIds }) },
      );
      setPrintStatus(d.message);
      setMsg(`Zebra: ${d.printed} printed, ${d.failed} failed`);
    } catch (e) {
      setPrintStatus(e instanceof Error ? e.message : 'Print failed');
    } finally {
      setBusy(false);
    }
  }

  function printBrowser() {
    window.print();
  }

  const previewTo =
    status && quantity > 0
      ? `${prefix}-${String(status.next_from + quantity - 1).padStart(4, '0')}`
      : '—';
  const previewFrom = status ? `${prefix}-${String(status.next_from).padStart(4, '0')}` : '—';

  return (
    <>
      <div className="page no-print">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>🏷️ Bulk QR Printer</h1>
        {status && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            {status.message} · Next: #{status.next_from} · Today: {status.total_today}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
          <div className="card">
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>PREVIEW</p>
            <p style={{ fontWeight: 700 }}>
              {previewFrom} → {previewTo}
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {quantity} wristbands · valid today only
            </p>
            <label style={{ display: 'block', marginTop: 20, marginBottom: 12 }}>
              Quantity
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn-ghost" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <input
                  type="number"
                  className="input"
                  value={quantity}
                  min={1}
                  max={2000}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                />
                <button type="button" className="btn-ghost" onClick={() => setQuantity((q) => Math.min(2000, q + 1))}>
                  +
                </button>
              </div>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              Prefix
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {['WB', 'BLR', 'HYD'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={prefix === p ? 'btn' : 'btn-ghost'}
                    onClick={() => setPrefix(p)}
                  >
                    {p}
                  </button>
                ))}
                <input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} style={{ flex: 1 }} />
              </div>
            </label>
            <label style={{ display: 'block', marginBottom: 20 }}>
              Batch label (optional)
              <input className="input" style={{ marginTop: 6 }} value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" disabled={busy} onClick={() => void generate()}>
                {busy ? '…' : '⚡ Generate Batch'}
              </button>
              <button type="button" className="btn-ghost" disabled={!lastIds.length || busy} onClick={() => void printZebra()}>
                🖨️ Zebra Print
              </button>
              <button type="button" className="btn-ghost" disabled={!lastIds.length} onClick={printBrowser}>
                🖨️ Browser Print
              </button>
            </div>
            {msg && <p style={{ marginTop: 16, fontSize: 12, color: 'var(--success)' }}>{msg}</p>}
            {printStatus && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{printStatus}</p>}
          </div>
          <div className="card">
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>TODAY&apos;S BATCHES</p>
            {batches.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>No batches yet today</p>
            ) : (
              batches.map((b) => (
                <div key={`${b.batch_label}-${b.first_id}`} className="batch-item">
                  <div className="batch-dot" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{b.batch_label || 'Batch'}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {b.first_id} → {b.last_id}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700 }}>{b.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
        {lastIds.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              QR PREVIEW · {lastIds[0]} → {lastIds[lastIds.length - 1]}
            </p>
            <div className="qr-grid">
              {lastIds.map((id) => (
                <div key={id} className="qr-card">
                  <QrImg text={id} />
                  <div className="qr-id">{id}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {lastIds.length > 0 && (
        <div
          className="print-area"
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            padding: 20,
            background: '#fff',
          }}
        >
          {lastIds.map((id) => (
            <div
              key={id}
              style={{
                border: '1px solid #ccc',
                padding: 12,
                textAlign: 'center',
                pageBreakInside: 'avoid',
              }}
            >
              <QrImg text={id} />
              <div style={{ fontWeight: 700, marginTop: 8, color: '#111' }}>{id}</div>
              <div style={{ fontSize: 10, color: '#333' }}>RideSnap Park</div>
            </div>
          ))}
        </div>
      )}

    </>
  );
}
