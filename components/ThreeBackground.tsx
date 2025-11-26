'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FloatingParticlesProps {
  count?: number;
  isDark?: boolean;
}

function FloatingParticles({ count = 2000, isDark = false }: FloatingParticlesProps) {
  const mesh = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 2000;
      positions[i3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i3 + 2] = (Math.random() - 0.5) * 2000;
      
      velocities[i3] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    
    return { positions, velocities };
  }, [count]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(particles.positions, 3));
    return geom;
  }, [particles.positions]);

  useFrame((state) => {
    if (!mesh.current) return;
    
    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] += Math.sin(time + i) * 0.1;
      positions[i3 + 1] += Math.cos(time + i) * 0.1;
      positions[i3 + 2] += Math.sin(time * 0.5 + i) * 0.1;
    }
    
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh} geometry={geometry}>
      <pointsMaterial
        size={2}
        color={isDark ? '#60a5fa' : '#3b82f6'}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

interface AnimatedSphereProps {
  position: [number, number, number];
  isDark: boolean;
}

function AnimatedSphere({ position, isDark }: AnimatedSphereProps) {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.01;
      mesh.current.rotation.y += 0.01;
      mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.5;
    }
  });

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[30, 32, 32]} />
      <meshStandardMaterial
        color={isDark ? '#1e40af' : '#3b82f6'}
        transparent
        opacity={0.1}
        wireframe
      />
    </mesh>
  );
}

interface ThreeBackgroundProps {
  isDark: boolean;
}

function ThreeBackground({ isDark }: ThreeBackgroundProps) {
  return (
    <div className="three-background">
      <Canvas
        camera={{ position: [0, 0, 100], fov: 75 }}
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <FloatingParticles count={1500} isDark={isDark} />
        <AnimatedSphere position={[-200, 100, -200]} isDark={isDark} />
        <AnimatedSphere position={[200, -100, -200]} isDark={isDark} />
      </Canvas>
    </div>
  );
}

export default ThreeBackground;

