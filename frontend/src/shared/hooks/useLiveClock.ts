import { useEffect, useState } from 'react';

export function useLiveClock(): string {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return clock;
}
