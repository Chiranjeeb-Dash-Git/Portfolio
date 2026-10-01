'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Points } from 'three';

export function ParticleField() {
  const pointsRef = useRef<Points>(null);
  const count = 250;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let j = 0; j < count; j++) {
      pos[j * 3] = (Math.random() - 0.5) * 14;
      pos[j * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[j * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return pos;
  }, []);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0006;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#8a8aff"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}
