export const PKG_LABELS: Record<string, string> = {
  digital: 'Digital',
  print: 'Print',
  frame: 'Frame',
  combo: 'Combo',
};

export const PAY_LABELS: Record<string, string> = {
  cash: '💵 Cash',
  upi: '📱 UPI',
  card: '💳 Card',
  split: '✂️ Split',
  razorpay: '🔗 Online',
};

export function pkgLabel(t: string): string {
  return PKG_LABELS[t] ?? t;
}

export function payLabel(m: string): string {
  return PAY_LABELS[m] ?? m;
}

export function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
