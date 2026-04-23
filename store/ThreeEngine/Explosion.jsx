"use client";
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
 
// ✅ OPTIMIZACIÓN: Matrix4 reutilizable creado UNA vez fuera del componente
// Antes: se creaba "new THREE.Matrix4()" 100 veces por frame (6000 objetos/seg a 60fps)
const _matrix = new THREE.Matrix4();
 
export default function Explosion({ position }) {
  const meshRef = useRef();
  const count = 100;
 
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        position: new THREE.Vector3(0, 0, 0),
      });
    }
    return temp;
  }, [count]);
 
  useFrame(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      p.position.add(p.velocity);
      p.velocity.y -= 0.01;
 
      // ✅ Reutilizamos _matrix en lugar de crear uno nuevo cada iteración
      _matrix.setPosition(
        p.position.x + position[0],
        p.position.y + position[1],
        p.position.z + position[2]
      );
      meshRef.current.setMatrixAt(i, _matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
 
  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial color="#00f7ff" emissive="#00f7ff" emissiveIntensity={10} />
    </instancedMesh>
  );
}