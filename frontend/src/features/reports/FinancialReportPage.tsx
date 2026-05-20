import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '@/shared/api/client';
import { formatInr, formatTime, payLabel, pkgLabel } from '@/shared/lib/format';
import { UserBar } from '@/shared/components/UserBar';

interface ReportOrder {
  id: string;
  guest_name: string;
  ride_name: string;
  order_type: string;
  payment_mode: string;
  price: number;
  created_at: string;
}

interface DailyReport {
  date: string;
  park_name: string;
  summary: { total_orders: number; total_revenue: number; avg_order: number };
  by_payment: Record<string, { count: number; amount: number }>;
  by_type: Record<string, { count: number; amount: number }>;
  by_ride: Record<string, { count: number; amount: number }>;
  by_hour: Record<string, { count: number; amount: number }>;
  orders: ReportOrder[];
}

export default function FinancialReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await api<{ report: DailyReport }>(`/reports/daily?date=${date}`);
      setReport(d.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function exportExcel() {
    if (!report) return;
    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.aoa_to_sheet([
      ['RideSnap Financial Report'],
      ['Date', report.date],
      ['Park', report.park_name],
      ['Total Orders', report.summary.total_orders],
      ['Total Revenue', report.summary.total_revenue],
      ['Avg Order', report.summary.avg_order],
    ]);
    XLSX.utils.book_append_sheet(wb, summary, 'Summary');

    const payRows = Object.entries(report.by_payment).map(([mode, d]) => [
      payLabel(mode),
      d.count,
      d.amount,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Payment', 'Orders', 'Revenue'], ...payRows]),
      'By Payment',
    );

    const hourRows = Object.entries(report.by_hour)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([h, d]) => [h, d.count, d.amount]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Hour', 'Orders', 'Revenue'], ...hourRows]),
      'By Hour',
    );

    const orderRows = report.orders.map((o) => [
      o.id,
      o.guest_name,
      o.ride_name,
      o.order_type,
      o.payment_mode,
      o.price,
      o.created_at,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['ID', 'Guest', 'Ride', 'Type', 'Payment', 'Price', 'Created'],
        ...orderRows,
      ]),
      'Orders',
    );

    XLSX.writeFile(wb, `ridesnap-report-${report.date}.xlsx`);
  }

  const maxPay = report
    ? Math.max(...Object.values(report.by_payment).map((p) => p.amount), 1)
    : 1;

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>📊 Financial Report</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            type="date"
            className="input"
            style={{ maxWidth: 200 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="button" className="btn" disabled={loading} onClick={() => void load()}>
            {loading ? 'Loading…' : 'Load Report'}
          </button>
          {report && (
            <button type="button" className="btn-ghost" onClick={exportExcel}>
              📥 Export Excel
            </button>
          )}
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {report && (
          <>
            <p style={{ marginBottom: 20, color: 'var(--muted)', fontSize: 12 }}>
              {report.park_name} · {report.date}
            </p>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>REVENUE</div>
                <div className="kpi-val">{formatInr(report.summary.total_revenue)}</div>
              </div>
              <div className="kpi-card">
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>ORDERS</div>
                <div className="kpi-val">{report.summary.total_orders}</div>
              </div>
              <div className="kpi-card">
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>AVG ORDER</div>
                <div className="kpi-val">{formatInr(report.summary.avg_order)}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, marginBottom: 16 }}>By payment mode</h2>
              {Object.entries(report.by_payment).map(([mode, data]) => {
                const pct = Math.round((data.amount / maxPay) * 100);
                return (
                  <div key={mode} className="bar-row">
                    <div className="bar-label">{payLabel(mode)}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }}>
                        {data.count} orders
                      </div>
                    </div>
                    <div className="bar-amt">{formatInr(data.amount)}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="card">
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>By package</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.by_type).map(([t, d]) => (
                        <tr key={t}>
                          <td>{pkgLabel(t)}</td>
                          <td>{d.count}</td>
                          <td>{formatInr(d.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card">
                <h2 style={{ fontSize: 14, marginBottom: 12 }}>By hour</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hour</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(report.by_hour)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([h, d]) => (
                          <tr key={h}>
                            <td>{h}</td>
                            <td>{d.count}</td>
                            <td>{formatInr(d.amount)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, marginBottom: 12 }}>By ride</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ride</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.by_ride)
                      .sort((a, b) => b[1].amount - a[1].amount)
                      .map(([ride, d]) => (
                        <tr key={ride}>
                          <td>{ride}</td>
                          <td>{d.count}</td>
                          <td>{formatInr(d.amount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 style={{ fontSize: 14, marginBottom: 12 }}>All orders</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Guest</th>
                      <th>Ride</th>
                      <th>Type</th>
                      <th>Pay</th>
                      <th>₹</th>
                      <th>Time</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{o.id}</td>
                        <td>{o.guest_name || 'Guest'}</td>
                        <td>{o.ride_name || '—'}</td>
                        <td>{pkgLabel(o.order_type)}</td>
                        <td>{payLabel(o.payment_mode || 'cash')}</td>
                        <td>{formatInr(o.price)}</td>
                        <td>{formatTime(o.created_at)}</td>
                        <td>
                          <Link to={`/receipt/${o.id}`} target="_blank" style={{ fontSize: 10 }}>
                            Receipt
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <UserBar pageName="Reports" />
    </>
  );
}
