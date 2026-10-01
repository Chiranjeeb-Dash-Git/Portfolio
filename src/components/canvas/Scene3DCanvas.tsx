'use client';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Preload } from '@react-three/drei';
import { Lighting } from './Lighting';
import { CoreDevice } from './CoreDevice';
import { SkillShardsGroup } from './SkillShardsGroup';
import { ParticleField } from './ParticleField';
import { LoaderFallback } from './LoaderFallback';

export function Scene3DCanvas() {
  return (
    <div id="canvas-wrap" className="fixed inset-0 z-0 pointer-events-none opacity-100 md:opacity-100">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 100 }}
      >
        <Suspense fallback={<LoaderFallback />}>
          <Lighting />
          <CoreDevice />
          <SkillShardsGroup />
          <ParticleField />
        </Suspense>
        <Preload all />
      </Canvas>
    </div>
  );
}
