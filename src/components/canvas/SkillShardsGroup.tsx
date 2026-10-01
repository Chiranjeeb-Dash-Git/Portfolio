'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';
import { useScrollStore } from '@/store/scrollStore';
import { mapRange } from '@/lib/three/lerp';

export function SkillShardsGroup() {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const progress = useScrollStore.getState().progress;

    const disassemble = progress > 0.3 && progress < 0.55 
      ? Math.sin(mapRange(progress, 0.3, 0.55, 0, Math.PI)) 
      : 0;

    groupRef.current.children.forEach((shard, i) => {
      const baseRadius = 1.15;
      const r = baseRadius + disassemble * 1.3;
      const baseAngle = (i / 6) * Math.PI * 2;
      const a = baseAngle + progress * Math.PI * 2;

      shard.position.x = Math.cos(a) * r;
      shard.position.y = Math.sin(a * 1.3) * r * 0.6;
      shard.position.z = Math.sin(a) * r;

      shard.rotation.x += 0.02;
      shard.rotation.y += 0.015;
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial
            color="#5ce6ff"
            emissive="#113344"
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
