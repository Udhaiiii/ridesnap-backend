import { useEffect, useState } from 'react';
import { api } from '@/shared/api/client';
import type { ParkConfig } from '@/shared/types/api';

export function useConfig() {
  const [config, setConfig] = useState<ParkConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<ParkConfig>('/config')
      .then(setConfig)
      .catch((e) => setError(e instanceof Error ? e.message : 'Config failed'));
  }, []);

  return { config, error };
}
