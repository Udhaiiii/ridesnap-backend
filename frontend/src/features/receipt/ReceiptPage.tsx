import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { PageHeader } from '@/shared/components/PageHeader';

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
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoadError('');
    setReceipt(null);
    void api<{ receipt: Receipt }>(`/receipt/${orderId}`)
      .then((d) => setReceipt(d.receipt))
      .catch(() => setLoadError('Order not found'));
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = searchId.trim();
    if (!id) return;
    navigate(`/receipt/${id}`);
  }

  if (!orderId) {
    return (
      <div className="page">
        <PageHeader
          title="Receipt"
          subtitle="Search any order by Order ID (legacy receipt.html)"
        />
        <form onSubmit={handleSearch} className="card flex flex-wrap gap-3">
          <input
            className="input min-w-[200px] flex-1"
            placeholder="Order ID e.g. ORD-20250520-001"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
          />
          <button type="submit" className="btn">
            Load Receipt →
          </button>
        </form>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="page">
        {loadError ? (
          <div className="alert alert-error">{loadError}</div>
        ) : (
          <p className="font-rs-mono text-sm text-rs-sub">Loading receipt…</p>
        )}
      </div>
    );
  }

  return (
    <div className="page max-w-[480px]">
      <div className="card">
        <p className="text-[11px] tracking-[3px] text-rs-amber">{receipt.park_name}</p>
        <h1 className="my-3 font-rs-display text-3xl">{receipt.receipt_no}</h1>
        <p className="text-xs text-rs-sub">{receipt.date}</p>
        <hr className="my-4 border-0 border-t border-dashed border-rs-border" />
        <p>
          <strong>{receipt.guest_name}</strong>
        </p>
        <p className="text-xs">Wristband: {receipt.wristband_id}</p>
        <p className="text-xs">Ride: {receipt.ride_name}</p>
        <p className="mt-3 text-sm">{receipt.item_name}</p>
        <p className="text-[28px] font-extrabold text-rs-amber">₹{receipt.amount}</p>
        <p className="text-xs text-rs-sub">{receipt.payment_mode}</p>
        <p className="mt-3 text-[11px]">{receipt.validity}</p>
      </div>
      <div className="card mt-4">
        <h2 className="mb-3 text-sm">Send to guest</h2>
        <input
          className="input mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input mb-3"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => void sendEmail()}>
            Email
          </button>
          <button type="button" className="btn-ghost" onClick={() => void sendSms()}>
            SMS
          </button>
          <button type="button" className="btn-ghost" onClick={() => void openWhatsapp()}>
            WhatsApp
          </button>
        </div>
        {msg && (
          <p className="mt-3 text-xs text-rs-green">{msg}</p>
        )}
      </div>
    </div>
  );
}
