import { useEffect, useState } from 'react';

export function useAnimatedNumber(target: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let cur = 0;
    const step = Math.max(1, Math.floor(target / 20));
    const timer = window.setInterval(() => {
      cur = Math.min(cur + step, target);
      setValue(cur);
      if (cur >= target) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [target]);

  return value;
}
