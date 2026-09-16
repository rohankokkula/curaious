"use client";

import { useMemo } from "react";
import * as THREE from "three";

const TABLE_TOP_Y = 0.74;
const TABLE_TOP_RADIUS = 1.15;

export function RoundTable() {
  const topMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f3f2ef",
        roughness: 0.28,
        metalness: 0.02,
        clearcoat: 0.35,
        clearcoatRoughness: 0.15,
      }),
    [],
  );

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c8c8c8",
        roughness: 0.14,
        metalness: 0.96,
      }),
    [],
  );

  const undersideMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a2826",
        roughness: 0.85,
        metalness: 0.08,
      }),
    [],
  );

  return (
    <group position={[0, 0, 0]}>
      <mesh
        position={[0, TABLE_TOP_Y, 0]}
        material={topMaterial}
        receiveShadow
        castShadow
      >
        <cylinderGeometry args={[TABLE_TOP_RADIUS, TABLE_TOP_RADIUS, 0.048, 64]} />
      </mesh>

      <mesh position={[0, TABLE_TOP_Y - 0.055, 0]} material={undersideMaterial} castShadow>
        <cylinderGeometry args={[TABLE_TOP_RADIUS - 0.08, TABLE_TOP_RADIUS - 0.12, 0.03, 48]} />
      </mesh>

      <mesh position={[0, 0.62, 0]} material={chromeMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 32]} />
      </mesh>

      <mesh position={[0, 0.38, 0]} material={chromeMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.42, 24]} />
      </mesh>

      <mesh position={[0, 0.09, 0]} material={chromeMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.54, 0.035, 40]} />
      </mesh>

      <mesh position={[0, 0.055, 0]} material={chromeMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.54, 0.54, 0.018, 40]} />
      </mesh>

      {[0, 1, 2, 3].map((index) => {
        const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
        const hubRadius = 0.28;
        const x = Math.cos(angle) * hubRadius;
        const z = Math.sin(angle) * hubRadius;
        const lean = 0.22;

        return (
          <group
            key={index}
            position={[x, 0.58, z]}
            rotation={[lean, angle + Math.PI, 0]}
          >
            <mesh position={[0, -0.24, 0]} material={chromeMaterial} castShadow receiveShadow>
              <cylinderGeometry args={[0.028, 0.032, 0.52, 16]} />
            </mesh>
            <mesh position={[0, -0.5, 0.04]} material={chromeMaterial} castShadow receiveShadow>
              <sphereGeometry args={[0.034, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
