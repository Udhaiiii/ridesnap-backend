import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/shared/api/client';
import { photoUrl, str } from '@/shared/lib/case';
import { formatInr, pkgLabel, payLabel } from '@/shared/lib/format';
import { Modal } from '@/shared/components/Modal';
import { UserBar } from '@/shared/components/UserBar';
import QRCode from 'qrcode';

type Pkg = 'digital' | 'print' | 'frame' | 'combo';
type PayMode = 'cash' | 'upi' | 'card' | 'split';

interface Photo {
  id: string;
  ride_name: string;
  url: string | null;
  status: string;
}

interface OrderRow {
  id: string;
  price?: number;
  order_type?: string;
}

interface Config {
  prices: Record<string, number>;
  payment: { upi_id: string; upi_name: string };
}

interface SplitRow {
  id: number;
  mode: PayMode;
  amount: string;
}

export default function PhotoDeskPage() {
  const [wbId, setWbId] = useState('');
  const [visitId, setVisitId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedPkg, setSelectedPkg] = useState<Pkg | null>(null);
  const [error, setError] = useState('');
  const [payOpen, setPayOpen] = useState(false);
  const [payMode, setPayMode] = useState<PayMode | null>(null);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);
  const [upiQr, setUpiQr] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [successPay, setSuccessPay] = useState<{ mode: PayMode; splits?: string } | null>(null);
  const [sendMsg, setSendMsg] = useState('');
  const [sendOk, setSendOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<Config & { success: boolean }>('/config').then((d) => setConfig(d));
  }, []);

  const payTotal =
    selectedPkg && config ? config.prices[selectedPkg] * selected.size : 0;

  const lookup = useCallback(async () => {
    const val = wbId.trim().toUpperCase();
    if (!val) return;
    setError('');
    setSelected(new Set());
    setSelectedPkg(null);
    try {
      const d = await api<{
        success: boolean;
        visit?: Record<string, unknown>;
        photos?: Record<string, unknown>[];
        error?: string;
      }>(`/visits/${val}`);
      if (!d.success) throw new Error(d.error ?? 'Not found');
      setVisitId(val);
      const v = d.visit ?? {};
      setGuestName(str(v, 'guest_name', 'guestName') || 'Guest');
      setPhone(str(v, 'phone'));
      setEmail(str(v, 'email'));
      setPhotos(
        (d.photos ?? []).map((p) => ({
          id: str(p, 'id'),
          ride_name: str(p, 'ride_name', 'rideName'),
          url: photoUrl(p),
          status: str(p, 'status'),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed');
      setVisitId(null);
      setPhotos([]);
    }
  }, [wbId]);

  function togglePhoto(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function renderUpiQr() {
    if (!config?.payment.upi_id) {
      setUpiQr('');
      return;
    }
    const link = `upi://pay?pa=${config.payment.upi_id}&pn=${encodeURIComponent(config.payment.upi_name || 'Park')}&am=${payTotal}&cu=INR&tn=${encodeURIComponent('RideSnap Photo')}`;
    setUpiQr(await QRCode.toDataURL(link, { width: 148, margin: 1 }));
  }

  useEffect(() => {
    if (payMode === 'upi' && payOpen) void renderUpiQr();
  }, [payMode, payOpen, payTotal, config]);

  function openPayment() {
    if (!selected.size || !selectedPkg) return;
    setPayMode(null);
    setSplitRows([
      { id: 1, mode: 'cash', amount: '' },
      { id: 2, mode: 'upi', amount: '' },
    ]);
    setPayOpen(true);
  }

  function splitBalance(): number {
    const sum = splitRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    return payTotal - sum;
  }

  function canConfirmPay(): boolean {
    if (!payMode) return false;
    if (payMode === 'split') return Math.abs(splitBalance()) < 0.01 && splitRows.some((r) => parseFloat(r.amount) > 0);
    return true;
  }

  async function confirmPayment() {
    if (!visitId || !selectedPkg || !payMode || !canConfirmPay()) return;
    setBusy(true);
    try {
      if (guestName || phone || email) {
        await api(`/visits/${visitId}/details`, {
          method: 'PATCH',
          body: JSON.stringify({
            guest_name: guestName.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
          }),
        });
      }
      const ids = [...selected];
      const isBulk = ids.length > 1;
      const payment_splits =
        payMode === 'split'
          ? JSON.stringify(
              splitRows
                .filter((r) => parseFloat(r.amount) > 0)
                .map((r) => ({ mode: r.mode, amount: parseFloat(r.amount) })),
            )
          : null;
      const base = {
        visit_id: visitId,
        order_type: selectedPkg,
        email: email.trim() || null,
        payment_mode: payMode,
        payment_splits,
      };
      const d = await api<{
        success: boolean;
        order?: OrderRow;
        orders?: OrderRow[];
        error?: string;
      }>(isBulk ? '/orders/bulk' : '/orders', {
        method: 'POST',
        body: JSON.stringify(
          isBulk ? { ...base, photo_ids: ids } : { ...base, photo_id: ids[0] },
        ),
      });
      if (!d.success) throw new Error(d.error);
      const placed = d.orders ?? (d.order ? [d.order] : []);
      setOrders(placed);
      setSuccessPay({
        mode: payMode,
        splits: payment_splits ?? undefined,
      });
      setPayOpen(false);
      setSuccessOpen(true);
      setSendMsg('');
      setSendOk(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setBusy(false);
    }
  }

  function resetDesk() {
    setWbId('');
    setVisitId(null);
    setPhotos([]);
    setSelected(new Set());
    setSelectedPkg(null);
    setGuestName('');
    setPhone('');
    setEmail('');
    setSuccessOpen(false);
    setOrders([]);
  }

  async function sendWhatsApp() {
    const orderId = orders[0]?.id;
    if (!orderId) return;
    setBusy(true);
    try {
      const d = await api<{ whatsapp_url: string }>('/send/whatsapp-link', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, phone: phone.trim() }),
      });
      window.open(d.whatsapp_url, '_blank');
      setSendMsg('WhatsApp opened — guest taps Send');
      setSendOk(true);
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : 'Failed');
      setSendOk(false);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    const orderId = orders[0]?.id;
    if (!email.trim()) {
      setSendMsg('Enter email first');
      setSendOk(false);
      return;
    }
    if (!orderId) return;
    setBusy(true);
    try {
      const d = await api<{ message: string }>('/send/email', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, email: email.trim() }),
      });
      setSendMsg(d.message);
      setSendOk(true);
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : 'Failed');
      setSendOk(false);
    } finally {
      setBusy(false);
    }
  }

  async function sendSms() {
    const orderId = orders[0]?.id;
    if (phone.trim().length < 10) {
      setSendMsg('Enter 10-digit phone');
      setSendOk(false);
      return;
    }
    if (!orderId) return;
    setBusy(true);
    try {
      const d = await api<{ message: string }>('/send/sms', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, phone: phone.trim() }),
      });
      setSendMsg(d.message);
      setSendOk(true);
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : 'Failed');
      setSendOk(false);
    } finally {
      setBusy(false);
    }
  }

  const pkgs: Pkg[] = ['digital', 'print', 'frame', 'combo'];

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>🖥️ Photo Desk</h1>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>STAFF COUNTER · SCAN GUEST WRISTBAND</p>

        <div className="card no-print" style={{ marginBottom: 16 }}>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void lookup();
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              className="input"
              placeholder="WB-0001"
              value={wbId}
              onChange={(e) => setWbId(e.target.value)}
              autoFocus
            />
            <button className="btn" type="submit">
              Lookup
            </button>
          </form>
          {error && <p style={{ marginTop: 10, color: 'var(--danger)', fontSize: 12 }}>{error}</p>}
        </div>

        {visitId && (
          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>GUEST</p>
            <p style={{ fontWeight: 700, marginBottom: 12 }}>
              {guestName} · {visitId} · {photos.length} photo{photos.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        )}

        {visitId && config && (
          <div className="card no-print" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>PACKAGE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {pkgs.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={selectedPkg === p ? 'btn' : 'btn-ghost'}
                  onClick={() => setSelectedPkg(p)}
                >
                  {pkgLabel(p)} {formatInr(config.prices[p])}
                </button>
              ))}
            </div>
            <button
              className="btn"
              type="button"
              style={{ marginTop: 16, width: '100%' }}
              disabled={!selected.size || !selectedPkg}
              onClick={openPayment}
            >
              Confirm Order ({selected.size} photo{selected.size !== 1 ? 's' : ''})
              {selectedPkg && selected.size ? ` · ${formatInr(payTotal)}` : ''}
            </button>
          </div>
        )}

        {photos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
            {photos.map((p) => (
              <div
                key={p.id}
                className={`card photo-card-select${selected.has(p.id) ? ' selected' : ''}`}
                onClick={() => togglePhoto(p.id)}
              >
                {p.url && <img src={p.url} alt="" style={{ width: '100%', borderRadius: 8 }} />}
                <p style={{ marginTop: 8, fontSize: 11 }}>{p.ride_name}</p>
                <p style={{ fontSize: 10, color: 'var(--muted)' }}>{p.status}</p>
              </div>
            ))}
          </div>
        ) : (
          visitId && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
              No photos today for this wristband
            </div>
          )
        )}
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="💳 Select Payment" wide>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          {selected.size}× {selectedPkg && pkgLabel(selectedPkg)} @{' '}
          {selectedPkg && config ? formatInr(config.prices[selectedPkg]) : ''} each
        </p>
        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>
          {formatInr(payTotal)}
        </p>
        <div className="pay-modes">
          {(['cash', 'upi', 'card', 'split'] as PayMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`pay-mode-btn${payMode === m ? ' active' : ''}`}
              onClick={() => setPayMode(m)}
            >
              <div className="pm-label">{payLabel(m)}</div>
            </button>
          ))}
        </div>
        {payMode === 'upi' && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            {upiQr ? (
              <img src={upiQr} alt="UPI QR" style={{ borderRadius: 8 }} />
            ) : (
              <p style={{ color: 'var(--danger)', fontSize: 12 }}>Set UPI_ID in backend .env</p>
            )}
            <p style={{ fontSize: 11, marginTop: 8 }}>{config?.payment.upi_id}</p>
          </div>
        )}
        {payMode === 'split' && (
          <div style={{ marginBottom: 16 }}>
            {splitRows.map((row, i) => (
              <div key={row.id} className="split-row">
                <select
                  className="input"
                  value={row.mode}
                  onChange={(e) => {
                    const next = [...splitRows];
                    next[i] = { ...row, mode: e.target.value as PayMode };
                    setSplitRows(next);
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
                <input
                  className="input"
                  type="number"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(e) => {
                    const next = [...splitRows];
                    next[i] = { ...row, amount: e.target.value };
                    setSplitRows(next);
                  }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setSplitRows(splitRows.filter((r) => r.id !== row.id))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() =>
                setSplitRows([...splitRows, { id: Date.now(), mode: 'cash', amount: '' }])
              }
            >
              + Add payment mode
            </button>
            <p style={{ fontSize: 12, marginTop: 10 }}>
              Remaining: <strong>{formatInr(splitBalance())}</strong>
            </p>
          </div>
        )}
        <button
          className="btn"
          type="button"
          style={{ width: '100%' }}
          disabled={!canConfirmPay() || busy}
          onClick={() => void confirmPayment()}
        >
          {busy ? 'Processing…' : '✅ Payment Received — Place Order'}
        </button>
      </Modal>

      <Modal open={successOpen} onClose={resetDesk} title="✅ Order confirmed" wide>
        <p style={{ marginBottom: 12, fontSize: 13 }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''} · Total{' '}
          {formatInr(orders.reduce((s, o) => s + (o.price ?? 0), 0))}
        </p>
        {successPay && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Payment: {payLabel(successPay.mode)}
          </p>
        )}
        {orders.map((o) => (
          <p key={o.id} style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            {o.id} · {formatInr(o.price ?? 0)}
          </p>
        ))}
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn" disabled={busy} onClick={() => void sendWhatsApp()}>
            💬 WhatsApp
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void sendEmail()}>
            📧 Email
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => void sendSms()}>
            📱 SMS
          </button>
        </div>
        {sendMsg && (
          <p style={{ marginTop: 12, fontSize: 12, color: sendOk ? 'var(--success)' : 'var(--danger)' }}>
            {sendMsg}
          </p>
        )}
        <button className="btn" type="button" style={{ marginTop: 20, width: '100%' }} onClick={resetDesk}>
          ✓ Next Guest
        </button>
      </Modal>

      <UserBar pageName="Photo Desk" />
    </>
  );
}
