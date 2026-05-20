/** Local park calendar date as YYYY-MM-DD (matches legacy SQLite date('now','localtime')). */
export function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

export function startOfTodayLocal(): Date {
  const [y, m, day] = todayLocal().split('-').map(Number);
  return new Date(y, m - 1, day, 0, 0, 0, 0);
}

export function endOfTodayLocal(): Date {
  const [y, m, day] = todayLocal().split('-').map(Number);
  return new Date(y, m - 1, day, 23, 59, 59, 999);
}

export function parseWristbandNumber(id: string): number {
  const parts = id.split('-');
  const num = parseInt(parts[parts.length - 1], 10);
  return Number.isNaN(num) ? 0 : num;
}
