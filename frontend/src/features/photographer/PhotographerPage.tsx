import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/shared/api/client';
import { PageHeader } from '@/shared/components/PageHeader';

const QrScannerModal = lazy(() =>
  import('@/features/photographer/components/QrScannerModal').then((m) => ({
    default: m.QrScannerModal,
  })),
);

interface Ride {
  id: string;
  name: string;
  emoji: string | null;
}

export default function PhotographerPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [rideId, setRideId] = useState('');
  const [wbId, setWbId] = useState('');
  const [valid, setValid] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api<{ rides: Ride[] }>('/rides').then((d) => {
      setRides(d.rides);
      if (d.rides[0]) setRideId(d.rides[0].id);
    });
    void api<{ success: boolean; checks?: { database: string } }>('/health')
      .then((d) => setHealthOk(d.success && d.checks?.database === 'ok'))
      .catch(() => setHealthOk(false));
  }, []);

  const validateWb = useCallback(async (id: string) => {
    const val = id.toUpperCase().trim();
    if (!val) {
      setValid(null);
      return;
    }
    try {
      const d = await api<{ valid: boolean; reason?: string }>(`/wristbands/validate/${val}`);
      setValid(d.valid);
      if (!d.valid) setMsg(d.reason ?? 'Invalid wristband');
      else setMsg('');
    } catch (e) {
      setValid(false);
      setMsg(e instanceof Error ? e.message : 'Validation failed');
    }
  }, []);

  async function upload(file: File) {
    if (!wbId || !valid) return;
    setUploading(true);
    setMsg('');
    const ride = rides.find((r) => r.id === rideId);
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('visit_id', wbId.toUpperCase());
    fd.append('ride_id', rideId);
    fd.append('ride_name', ride?.name ?? 'Unknown');
    try {
      const d = await api<{ message: string }>('/photos/upload', {
        method: 'POST',
        body: fd,
        headers: {},
      });
      setMsg(d.message ?? 'Uploaded!');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onScanned(text: string) {
    setWbId(text);
    void validateWb(text);
  }

  return (
    <>
      <div className="page">
        <PageHeader
          title="📷 Photographer"
          subtitle="Scan wristband QR or enter ID, then capture photo"
          action={
            healthOk !== null && (
              <span style={{ fontSize: 11, color: healthOk ? 'var(--success)' : 'var(--danger)' }}>
                {healthOk ? '● Online' : '● Offline'}
              </span>
            )
          }
        />
        <div className="card" style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Ride
            <select
              className="input"
              style={{ marginTop: 6 }}
              value={rideId}
              onChange={(e) => setRideId(e.target.value)}
            >
              {rides.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Wristband ID
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                className="input"
                value={wbId}
                onChange={(e) => {
                  setWbId(e.target.value);
                  void validateWb(e.target.value);
                }}
                placeholder="WB-0001"
              />
              <button type="button" className="btn-ghost" onClick={() => setScannerOpen(true)}>
                📷 Scan QR
              </button>
            </div>
          </label>
          {valid === true && <div className="alert alert-success">✓ Valid wristband</div>}
          {valid === false && <div className="alert alert-error">{msg}</div>}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <button
            className="btn"
            disabled={!valid || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Capture / Upload Photo'}
          </button>
          {msg && valid && (
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--success)' }}>{msg}</p>
          )}
        </div>
      </div>
      {scannerOpen && (
        <Suspense
          fallback={
            <div className="overlay">
              <div className="overlay-box">
                <p>Loading scanner…</p>
              </div>
            </div>
          }
        >
          <QrScannerModal
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onScan={onScanned}
          />
        </Suspense>
      )}
    </>
  );
}
