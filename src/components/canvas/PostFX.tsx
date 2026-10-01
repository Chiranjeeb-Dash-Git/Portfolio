'use client';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Vector2 } from 'three';

export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.6}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.8}
        mipmapBlur
      />
      <ChromaticAberration
        offset={new Vector2(0.001, 0.001)}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  );
}
