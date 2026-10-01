'use client';
import { Html, useProgress } from '@react-three/drei';

export function LoaderFallback() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-cyan-400/90 text-sm font-mono tracking-widest uppercase bg-black/60 px-4 py-2 border border-violet-500/30 backdrop-blur-md rounded">
        {Math.floor(progress)}% core initialized
      </div>
    </Html>
  );
}
