"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

interface ChairProps {
  position: [number, number, number];
  rotationY: number;
  isActive: boolean;
  isUserSeat?: boolean;
  accentColor?: string;
}

function createCantileverCurve(side: number) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.23, 0.05, 0.36),
    new THREE.Vector3(side * 0.23, 0.24, 0.2),
    new THREE.Vector3(side * 0.23, 0.43, 0.04),
    new THREE.Vector3(side * 0.23, 0.58, -0.1),
    new THREE.Vector3(side * 0.23, 0.34, -0.24),
    new THREE.Vector3(side * 0.23, 0.05, -0.34),
  ]);
}

function ChromeTube({
  curve,
  material,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  material: THREE.MeshStandardMaterial;
}) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 32, 0.018, 8, false),
    [curve],
  );

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

function ArmTube({
  x,
  zStart,
  zEnd,
  y,
  material,
}: {
  x: number;
  zStart: number;
  zEnd: number;
  y: number;
  material: THREE.MeshStandardMaterial;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(x, y, zStart),
      new THREE.Vector3(x, y, zEnd),
    );
    return new THREE.TubeGeometry(curve, 8, 0.014, 8, false);
  }, [x, y, zStart, zEnd]);

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

export function Chair({
  position,
  rotationY,
  isActive,
  isUserSeat = false,
  accentColor = "#5a9de8",
}: ChairProps) {
  const woodColor = isUserSeat
    ? isActive
      ? "#e8c547"
      : "#3d3520"
    : isActive
      ? accentColor
      : "#141c2e";
  const chromeColor = isUserSeat
    ? isActive
      ? "#f5e6b8"
      : "#5a5040"
    : isActive
      ? "#d4e4f8"
      : "#2a3548";
  const emissive = isUserSeat
    ? isActive
      ? "#e8c547"
      : "#000000"
    : isActive
      ? accentColor
      : "#000000";
  const emissiveIntensity = isActive ? (isUserSeat ? 0.5 : 0.35) : 0;

  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: woodColor,
        emissive: new THREE.Color(emissive),
        emissiveIntensity,
        roughness: 0.62,
        metalness: isUserSeat ? 0.12 : 0.04,
      }),
    [woodColor, emissive, emissiveIntensity, isUserSeat],
  );

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: chromeColor,
        roughness: 0.18,
        metalness: 0.92,
      }),
    [chromeColor],
  );

  const leftFrame = useMemo(() => createCantileverCurve(-1), []);
  const rightFrame = useMemo(() => createCantileverCurve(1), []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, 0, 0.06]}>
      <RoundedBox
        args={[0.5, 0.055, 0.46]}
        radius={0.028}
        smoothness={6}
        material={woodMaterial}
        position={[0, 0.43, 0.02]}
        castShadow
        receiveShadow
      />

      <RoundedBox
        args={[0.48, 0.4, 0.05]}
        radius={0.024}
        smoothness={6}
        material={woodMaterial}
        position={[0, 0.72, -0.13]}
        rotation={[-0.18, 0, 0]}
        castShadow
        receiveShadow
      />

      <ArmTube x={-0.24} y={0.46} zStart={0.16} zEnd={-0.1} material={chromeMaterial} />
      <ArmTube x={0.24} y={0.46} zStart={0.16} zEnd={-0.1} material={chromeMaterial} />

      <ChromeTube curve={leftFrame} material={chromeMaterial} />
      <ChromeTube curve={rightFrame} material={chromeMaterial} />

      <mesh
        material={chromeMaterial}
        position={[0, 0.05, 0.36]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.014, 0.4, 4, 12]} />
      </mesh>
      <mesh
        material={chromeMaterial}
        position={[0, 0.05, -0.34]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.014, 0.4, 4, 12]} />
      </mesh>
      </group>
    </group>
  );
}
