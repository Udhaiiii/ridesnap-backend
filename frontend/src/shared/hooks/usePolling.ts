import { useEffect, useRef } from 'react';

/** Runs callback on an interval; pauses when tab is hidden. */
export function usePolling(callback: () => void | Promise<void>, ms: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === 'visible') void saved.current();
    };
    tick();
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}
