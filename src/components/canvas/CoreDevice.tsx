'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import { useScrollStore } from '@/store/scrollStore';
import { mapRange, lerp } from '@/lib/three/lerp';

export function CoreDevice() {
  const coreRef = useRef<Group>(null);

  useFrame(() => {
    if (!coreRef.current) return;
    const progress = useScrollStore.getState().progress;

    coreRef.current.rotation.y = lerp(coreRef.current.rotation.y, progress * Math.PI * 4, 0.06);
    coreRef.current.rotation.x = lerp(coreRef.current.rotation.x, progress * Math.PI * 0.6, 0.06);

    const targetZ = progress > 0.85 ? mapRange(progress, 0.85, 1, 0, -3.5) : 0;
    coreRef.current.position.z = lerp(coreRef.current.position.z, targetZ, 0.05);

    const targetX = mapRange(progress, 0, 0.15, 0, 0.6);
    coreRef.current.position.x = lerp(coreRef.current.position.x, targetX, 0.06);
  });

  return (
    <group ref={coreRef}>
      <mesh>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial
          color="#141420"
          metalness={0.6}
          roughness={0.25}
          flatShading
        />
      </mesh>

      <mesh>
        <icosahedronGeometry args={[1.32, 1]} />
        <meshBasicMaterial
          color="#7c5cff"
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}
