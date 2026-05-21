import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function envOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  const allowed = envOrigins();
  if (allowed.includes(origin)) return true;

  if (process.env.NODE_ENV !== 'production' && DEV_ORIGIN.test(origin)) {
    return true;
  }

  return false;
}

export function getCorsOptions(): CorsOptions {
  const allowed = envOrigins();
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, origin ?? true);
      } else if (!origin && isDev) {
        callback(null, true);
      } else if (!allowed.length && !origin) {
        callback(null, true);
      } else if (!allowed.length && isDev) {
        callback(null, origin ?? true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    credentials: false,
    maxAge: 86400,
  };
}
