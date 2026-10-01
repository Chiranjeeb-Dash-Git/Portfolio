'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3, CatmullRomCurve3 } from 'three';
import { useScrollStore } from '@/store/scrollStore';
import { damp } from '@/lib/three/lerp';

const CAMERA_PATH = [
  new Vector3(0, 0, 6),
  new Vector3(0.6, 0.2, 5.0),
  new Vector3(-0.8, 0.4, 4.2),
  new Vector3(0.5, -0.3, 5.5),
  new Vector3(0, 0, 8.5),
];

const curve = new CatmullRomCurve3(CAMERA_PATH);

export function CameraRig() {
  const targetPos = useRef(new Vector3());

  useFrame((state, delta) => {
    const p = useScrollStore.getState().progress;
    curve.getPoint(Math.max(0, Math.min(1, p)), targetPos.current);

    state.camera.position.x = damp(state.camera.position.x, targetPos.current.x, 3, delta);
    state.camera.position.y = damp(state.camera.position.y, targetPos.current.y, 3, delta);
    state.camera.position.z = damp(state.camera.position.z, targetPos.current.z, 3, delta);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}
