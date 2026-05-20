import { useState } from 'react';
import { api } from '@/lib/api';
import { UserBar } from '@/components/UserBar';

export default function FinancialReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

  async function load() {
    const d = await api<{ report: Record<string, unknown> }>(`/reports/daily?date=${date}`);
    setReport(d.report);
  }

  return (
    <>
      <div className="page">
        <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: 20 }}>📊 Financial Report</h1>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input type="date" className="input" style={{ maxWidth: 200 }} value={date} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="btn" onClick={() => void load()}>
            Load Report
          </button>
        </div>
        {report && (
          <div className="card">
            <pre style={{ fontSize: 11, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <UserBar pageName="Reports" />
    </>
  );
}
