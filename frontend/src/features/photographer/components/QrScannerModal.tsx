import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}

export function QrScannerModal({ open, onClose, onScan }: QrScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hint, setHint] = useState('Hold steady — scanning…');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    let active = true;
    const elId = 'html5qr-scanner-root';

    async function start() {
      setError('');
      setHint('Starting camera…');
      try {
        const scanner = new Html5Qrcode(elId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (!active) return;
            const text = decoded.trim().toUpperCase();
            if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
            void stop();
            onScan(text);
            onClose();
          },
          () => undefined,
        );
        setHint('Point at wristband QR code');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Camera access denied or unavailable',
        );
        setHint('Allow camera access and retry');
      }
    }

    async function stop() {
      active = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          if (s.isScanning) await s.stop();
          await s.clear();
        } catch {
          /* ignore */
        }
      }
    }

    void start();
    return () => {
      void stop();
    };
  }, [open, onClose, onScan]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className="overlay-box"
        style={{ maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h2 className="overlay-title">📷 Scan wristband QR</h2>
        <div
          id="html5qr-scanner-root"
          style={{
            width: '100%',
            minHeight: 280,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#000',
          }}
        />
        <p style={{ fontSize: 12, color: error ? 'var(--danger)' : 'var(--muted)', marginTop: 12 }}>
          {error || hint}
        </p>
        <button type="button" className="btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
