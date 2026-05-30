"use client";

import { Float, Line, Points, PointMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Scene() {
  const group = useRef<THREE.Group>(null);
  const points = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const a = (i / 42) * Math.PI * 2;
    const r = 1.3 + (i % 7) * 0.18;
    return new THREE.Vector3(Math.cos(a) * r, Math.sin(i * 1.8) * 0.55, Math.sin(a) * r);
  }), []);
  const positions = useMemo(() => new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])), [points]);
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.12;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.08;
  });
  return (
    <group ref={group}>
      <Float speed={1.3} floatIntensity={0.6}>
        <mesh>
          <sphereGeometry args={[0.38, 48, 48]} />
          <meshStandardMaterial emissive="#22c55e" emissiveIntensity={1.5} color="#15803d" roughness={0.25} />
        </mesh>
      </Float>
      <Points positions={positions}>
        <PointMaterial size={0.055} color="#4ade80" transparent opacity={0.85} />
      </Points>
      {points.slice(0, 18).map((p, i) => (
        <Line key={i} points={[p, points[(i * 5 + 9) % points.length]]} color="#22c55e" transparent opacity={0.22} lineWidth={1} />
      ))}
      <ambientLight intensity={0.5} />
      <pointLight position={[2, 3, 4]} intensity={8} color="#22c55e" />
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.2} />
      </EffectComposer>
    </group>
  );
}

export function Constellation() {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0.4, 4.4], fov: 50 }} dpr={[1, 1.6]}>
        <Scene />
      </Canvas>
    </div>
  );
}
