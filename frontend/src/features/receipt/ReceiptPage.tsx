import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/shared/api/client';

interface Receipt {
  receipt_no: string;
  guest_name: string;
  wristband_id: string;
  ride_name: string;
  item_name: string;
  amount: number;
  payment_mode: string;
  date: string;
  park_name: string;
  validity: string;
}

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!orderId) return;
    void api<{ receipt: Receipt }>(`/receipt/${orderId}`).then((d) => setReceipt(d.receipt));
  }, [orderId]);

  async function sendEmail() {
    if (!orderId) return;
    const d = await api<{ message: string }>('/send/email', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, email }),
    });
    setMsg(d.message);
  }

  async function sendSms() {
    if (!orderId) return;
    const d = await api<{ message: string }>('/send/sms', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, phone }),
    });
    setMsg(d.message);
  }

  async function openWhatsapp() {
    if (!orderId) return;
    const d = await api<{ whatsapp_url: string }>('/send/whatsapp-link', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, phone }),
    });
    window.open(d.whatsapp_url, '_blank');
  }

  if (!receipt) {
    return <div className="page">Loading receipt…</div>;
  }

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <div className="card">
        <p style={{ color: 'var(--accent)', letterSpacing: 3, fontSize: 11 }}>{receipt.park_name}</p>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: '12px 0' }}>{receipt.receipt_no}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 12 }}>{receipt.date}</p>
        <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '16px 0' }} />
        <p><strong>{receipt.guest_name}</strong></p>
        <p style={{ fontSize: 12 }}>Wristband: {receipt.wristband_id}</p>
        <p style={{ fontSize: 12 }}>Ride: {receipt.ride_name}</p>
        <p style={{ fontSize: 14, marginTop: 12 }}>{receipt.item_name}</p>
        <p style={{ fontSize: 28, color: 'var(--accent)', fontWeight: 800 }}>₹{receipt.amount}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{receipt.payment_mode}</p>
        <p style={{ fontSize: 11, marginTop: 12 }}>{receipt.validity}</p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>Send to guest</h2>
        <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 8 }} />
        <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn" onClick={() => void sendEmail()}>Email</button>
          <button type="button" className="btn-ghost" onClick={() => void sendSms()}>SMS</button>
          <button type="button" className="btn-ghost" onClick={() => void openWhatsapp()}>WhatsApp</button>
        </div>
        {msg && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--success)' }}>{msg}</p>}
      </div>
    </div>
  );
}
