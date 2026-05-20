/** Normalize Nest (camelCase) and legacy Express (snake_case) API fields. */

export function str(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!obj) return '';
  for (const k of keys) {
    const v = obj[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
}

export function num(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number') return v;
    if (v != null) return Number(v) || 0;
  }
  return 0;
}

export function photoUrl(p: Record<string, unknown>): string | null {
  return (
    str(p, 's3_url', 's3Url') ||
    str(p, 'watermark_url', 'watermarkUrl') ||
    null
  );
}
