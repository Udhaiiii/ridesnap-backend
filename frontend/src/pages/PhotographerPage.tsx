import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { UserBar } from '@/components/UserBar';

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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api<{ rides: Ride[] }>('/rides').then((d) => {
      setRides(d.rides);
      if (d.rides[0]) setRideId(d.rides[0].id);
    });
  }, []);

  const validateWb = useCallback(async (id: string) => {
    const val = id.toUpperCase().trim();
    if (!val) {
      setValid(null);
      return;
    }
    const d = await api<{ valid: boolean; reason?: string }>(
      `/wristbands/validate/${val}`,
    );
    setValid(d.valid);
    if (!d.valid) setMsg(d.reason ?? 'Invalid wristband');
    else setMsg('');
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

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>📷 Photographer</h1>
        <div className="card" style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Ride
            <select className="input" style={{ marginTop: 6 }} value={rideId} onChange={(e) => setRideId(e.target.value)}>
              {rides.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.emoji} {r.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Wristband ID
            <input
              className="input"
              style={{ marginTop: 6 }}
              value={wbId}
              onChange={(e) => {
                setWbId(e.target.value);
                void validateWb(e.target.value);
              }}
              placeholder="WB-0001"
            />
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
          {msg && valid && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--success)' }}>{msg}</p>}
        </div>
      </div>
      <UserBar pageName="Photographer" />
    </>
  );
}
