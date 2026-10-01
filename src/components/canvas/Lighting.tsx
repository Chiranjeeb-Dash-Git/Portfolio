'use client';

export function Lighting() {
  return (
    <>
      <directionalLight position={[3, 4, 3]} intensity={1.1} color="#ffffff" />
      <ambientLight intensity={0.35} color="#9090ff" />
      <pointLight position={[-3, -2, -2]} intensity={1.2} distance={20} color="#5ce6ff" />
    </>
  );
}
