'use client';
import { useEffect, useState } from 'react';
import { useScrollStore } from '@/store/scrollStore';

export function ScrollProgressBridge() {
  const setProgress = useScrollStore((s) => s.setProgress);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      const clamped = Math.max(0, Math.min(1, p));
      setProgress(clamped);
      setPercent(clamped * 100);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [setProgress]);

  return (
    <div
      id="progress"
      style={{ width: `${percent}%` }}
    />
  );
}
