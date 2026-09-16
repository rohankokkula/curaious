"use client";

import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Chair } from "./Chair";
import {
  getFocusCameraT,
  getFocusEnvironmentOpacity,
  getFocusHeroT,
  getFocusSceneFade,
  getFocusScenePresence,
  getSeatAccent,
  getSeatPosition,
  getSeatRotation,
  getUserSeatHeroPosition,
  getUserSeatHeroRotation,
  getUserSeatHeroScale,
  isSeatHighlighted,
  SEAT_COUNT,
  USER_SEAT_INDEX,
} from "./chapters";
import type { TableCenterMode } from "./chapters";
import { RoundTable } from "./RoundTable";
import { FeedbackCenter } from "./FeedbackCenter";
import { TableCenter } from "./TableCenter";
import type { StoryPhase } from "./chapters";
import { SeatScoreLabels } from "./SeatScoreLabel";

interface TableSceneProps {
  activeSeatIndex: number;
  centerMode: TableCenterMode;
  showHub: boolean;
  showTopicCard: boolean;
  showFeedback: boolean;
  feedbackRound: number;
  storyPhase: StoryPhase;
  showScores: boolean;
  revealedScores: Array<number | null>;
  averageProgress?: number;
  focusProgress?: number;
  focusProgressRef?: RefObject<number>;
  viewProgressRef: RefObject<number>;
  reducedMotion?: boolean;
}

interface SceneLightsProps {
  activeSeatIndex: number;
  viewProgressRef: RefObject<number>;
  focusProgressRef?: RefObject<number>;
  reducedMotion?: boolean;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function smoothStep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function sampleArcPoint(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number,
  target: THREE.Vector3,
) {
  const oneMinusT = 1 - t;
  const a = oneMinusT * oneMinusT;
  const b = 2 * oneMinusT * t;
  const c = t * t;
  target.set(0, 0, 0);
  target.addScaledVector(start, a);
  target.addScaledVector(control, b);
  target.addScaledVector(end, c);
  return target;
}

function CameraRig({
  viewProgressRef,
  focusProgressRef,
  isMobile,
}: {
  viewProgressRef: RefObject<number>;
  focusProgressRef?: RefObject<number>;
  isMobile: boolean;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const smoothViewRef = useRef(0);
  const angledPosition = useMemo(
    () =>
      new THREE.Vector3(
        0,
        isMobile ? 5.8 : 5.2,
        isMobile ? 5.4 : 4.6,
      ),
    [isMobile],
  );
  const arcPosition = useMemo(
    () => new THREE.Vector3(0, isMobile ? 6.4 : 7.2, isMobile ? 3.4 : 2.8),
    [isMobile],
  );
  const topPosition = useMemo(
    () => new THREE.Vector3(0, isMobile ? 7.2 : 8.4, 0.01),
    [isMobile],
  );
  const angledLookAt = useMemo(() => new THREE.Vector3(0, 0.45, 0), []);
  const topLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const focusCameraPosition = useMemo(
    () =>
      new THREE.Vector3(
        isMobile ? 0.15 : 0.22,
        isMobile ? 3.15 : 2.75,
        isMobile ? 5.75 : 5.35,
      ),
    [isMobile],
  );
  const focusLookAt = useMemo(() => new THREE.Vector3(0, 0.48, 0.02), []);
  const focusMoveControl = useMemo(
    () =>
      new THREE.Vector3(
        isMobile ? 0.08 : 0.12,
        isMobile ? 5.1 : 5.6,
        isMobile ? 3.8 : 3.2,
      ),
    [isMobile],
  );
  const focusLookControl = useMemo(
    () => new THREE.Vector3(0, 0.24, 0.04),
    [],
  );
  const topCameraPoint = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const cameraPoint = useMemo(() => new THREE.Vector3(), []);
  const focusCameraPoint = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const viewTarget = viewProgressRef.current ?? 0;
    smoothViewRef.current = THREE.MathUtils.damp(
      smoothViewRef.current,
      viewTarget,
      5.5,
      delta,
    );
    const viewT = smoothStep(smoothViewRef.current);

    sampleArcPoint(angledPosition, arcPosition, topPosition, viewT, topCameraPoint);

    const focusT = focusProgressRef?.current ?? 0;
    const cameraT = getFocusCameraT(focusT);

    focusCameraPoint.copy(focusCameraPosition);
    sampleArcPoint(
      topCameraPoint,
      focusMoveControl,
      focusCameraPoint,
      cameraT,
      cameraPoint,
    );
    camera.position.copy(cameraPoint);

    sampleArcPoint(topLookAt, focusLookControl, focusLookAt, cameraT, lookTarget);
    camera.lookAt(lookTarget);

    const topFov = THREE.MathUtils.lerp(
      isMobile ? 50 : 42,
      isMobile ? 44 : 36,
      viewT,
    );
    camera.fov = THREE.MathUtils.lerp(topFov, isMobile ? 42 : 38, cameraT);
    camera.updateProjectionMatrix();
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[0, 3.45, 5.35]}
      fov={42}
    />
  );
}

function prepareFadeMaterials(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    const prepared = materials.map((material) => {
      if (!material) return material;
      const clone = material.clone();
      clone.transparent = true;
      clone.opacity = 1;
      clone.depthWrite = true;
      return clone;
    });

    child.material = prepared.length === 1 ? prepared[0] : prepared;
  });
}

function applyObjectOpacity(root: THREE.Object3D, opacity: number) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.82;
    });
  });
}

function FocusHeroChair({
  focusProgressRef,
  focusProgress,
  isMobile,
  visible,
}: {
  focusProgressRef?: RefObject<number>;
  focusProgress: number;
  isMobile: boolean;
  visible: boolean;
}) {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!outerRef.current || !innerRef.current || !visible) return;

    const t = focusProgressRef?.current ?? focusProgress;
    const heroT = getFocusHeroT(t);
    const [x, y, z] = getUserSeatHeroPosition(t);
    outerRef.current.position.set(x, y, z);
    outerRef.current.rotation.y = getUserSeatHeroRotation(t);
    innerRef.current.scale.setScalar(getUserSeatHeroScale(isMobile, t));
    outerRef.current.visible = t > 0.005;
  });

  if (!visible) return null;

  return (
    <group ref={outerRef}>
      <group ref={innerRef}>
        <Chair position={[0, 0, 0]} rotationY={0} isActive isUserSeat />
      </group>
    </group>
  );
}

function TableEnvironment({
  activeSeatIndex,
  storyPhase,
  focusProgressRef,
  isMobile,
  chairs,
}: {
  activeSeatIndex: number;
  storyPhase: StoryPhase;
  focusProgressRef?: RefObject<number>;
  isMobile: boolean;
  chairs: Array<{
    index: number;
    position: [number, number, number];
    rotationY: number;
  }>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tableRef = useRef<THREE.Group>(null);
  const chairsRef = useRef<THREE.Group>(null);
  const shadowsRef = useRef<THREE.Group>(null);
  const floorRef = useRef<THREE.Mesh>(null);
  const materialsReadyRef = useRef(false);
  const baseYRef = useRef(0);
  const smoothTableOpacityRef = useRef(1);
  const smoothChairOpacityRef = useRef(1);
  const showUserSeat = storyPhase !== "focus" && storyPhase !== "form";
  const userSeat = chairs.find(({ index }) => index === USER_SEAT_INDEX);

  useLayoutEffect(() => {
    if (!groupRef.current || materialsReadyRef.current) return;
    prepareFadeMaterials(groupRef.current);
    materialsReadyRef.current = true;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !tableRef.current || !chairsRef.current) return;

    const focusT = focusProgressRef?.current ?? 0;
    const isFocusPhase = storyPhase === "focus" || storyPhase === "form";

    if (!isFocusPhase) {
      smoothTableOpacityRef.current = 1;
      smoothChairOpacityRef.current = 1;
      groupRef.current.position.y = baseYRef.current;
      groupRef.current.scale.setScalar(1);
      applyObjectOpacity(groupRef.current, 1);
      groupRef.current.visible = true;
      if (floorRef.current) floorRef.current.visible = true;
      if (shadowsRef.current) shadowsRef.current.visible = true;
      return;
    }

    const targetOpacity = getFocusEnvironmentOpacity(focusT);
    smoothTableOpacityRef.current = THREE.MathUtils.damp(
      smoothTableOpacityRef.current,
      targetOpacity,
      18,
      delta,
    );
    smoothChairOpacityRef.current = THREE.MathUtils.damp(
      smoothChairOpacityRef.current,
      targetOpacity,
      18,
      delta,
    );

    const envOpacity = Math.min(
      smoothTableOpacityRef.current,
      smoothChairOpacityRef.current,
    );
    const tableFade = 1 - envOpacity;

    groupRef.current.position.y = baseYRef.current - tableFade * 0.1;
    groupRef.current.scale.setScalar(1 - tableFade * 0.012);
    applyObjectOpacity(tableRef.current, envOpacity);
    applyObjectOpacity(chairsRef.current, envOpacity);

    groupRef.current.visible = envOpacity > 0.02;
    if (floorRef.current) floorRef.current.visible = envOpacity > 0.02;
    if (shadowsRef.current) shadowsRef.current.visible = envOpacity > 0.02;
  });

  return (
    <group ref={groupRef}>
      <group ref={tableRef}>
        <RoundTable />
        <group ref={shadowsRef}>
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.35}
            scale={isMobile ? 5 : 8}
            blur={2.5}
            far={4}
          />
        </group>
        <mesh
          ref={floorRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[5, 64]} />
          <meshStandardMaterial color="#000000" roughness={1} />
        </mesh>
      </group>

      <group ref={chairsRef}>
        {chairs.map(({ index, position, rotationY }) => {
          if (index === USER_SEAT_INDEX) return null;

          return (
            <Chair
              key={index}
              position={position}
              rotationY={rotationY}
              isActive={isSeatHighlighted(index, activeSeatIndex, storyPhase)}
              isUserSeat={false}
              accentColor={getSeatAccent(index).accent}
            />
          );
        })}
      </group>

      {showUserSeat && userSeat ? (
        <Chair
          position={userSeat.position}
          rotationY={userSeat.rotationY}
          isActive={isSeatHighlighted(
            USER_SEAT_INDEX,
            activeSeatIndex,
            storyPhase,
          )}
          isUserSeat
        />
      ) : null}
    </group>
  );
}

function SceneContent({
  activeSeatIndex,
  centerMode,
  showHub,
  showTopicCard,
  showFeedback,
  feedbackRound,
  storyPhase,
  showScores,
  revealedScores,
  averageProgress = 0,
  focusProgress = 0,
  focusProgressRef,
  centerLabelOpacityRef,
  isMobile = false,
}: {
  activeSeatIndex: number;
  centerMode: TableCenterMode;
  showHub: boolean;
  showTopicCard: boolean;
  showFeedback: boolean;
  feedbackRound: number;
  storyPhase: StoryPhase;
  showScores: boolean;
  revealedScores: Array<number | null>;
  averageProgress?: number;
  focusProgress?: number;
  focusProgressRef?: RefObject<number>;
  centerLabelOpacityRef: RefObject<number>;
  isMobile?: boolean;
}) {
  const chairs = useMemo(
    () =>
      Array.from({ length: SEAT_COUNT }, (_, index) => ({
        index,
        position: getSeatPosition(index),
        rotationY: getSeatRotation(index),
      })),
    [],
  );
  const isFocusPhase = storyPhase === "focus" || storyPhase === "form";

  return (
    <group scale={isMobile ? 0.62 : 1} position={isMobile ? [0, 0.15, 0] : [0, 0, 0]}>
      <TableEnvironment
        activeSeatIndex={activeSeatIndex}
        storyPhase={storyPhase}
        focusProgressRef={focusProgressRef}
        isMobile={isMobile}
        chairs={chairs}
      />

      {isFocusPhase ? (
        <FocusHeroChair
          focusProgressRef={focusProgressRef}
          focusProgress={focusProgress}
          isMobile={isMobile}
          visible
        />
      ) : null}

      {(showHub || showTopicCard) && !showFeedback ? (
        <TableCenter
          activeSeatIndex={activeSeatIndex}
          centerMode={centerMode}
          showHub={showHub}
          showTopicCard={showTopicCard}
          opacityRef={centerLabelOpacityRef}
          isMobile={isMobile}
        />
      ) : null}

      {showFeedback ? (
        <FeedbackCenter
          feedbackRound={feedbackRound}
          averageProgress={averageProgress}
          opacityRef={centerLabelOpacityRef}
          isMobile={isMobile}
        />
      ) : null}

      {showScores ? (
        <SeatScoreLabels
          scores={revealedScores}
          activeSeatIndex={activeSeatIndex}
          averageProgress={averageProgress}
          focusProgressRef={focusProgressRef}
        />
      ) : null}
    </group>
  );
}

function SceneLights({
  activeSeatIndex,
  viewProgressRef,
  focusProgressRef,
  reducedMotion = false,
}: SceneLightsProps) {
  const spotRef = useRef<THREE.SpotLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const breatheRef = useRef(0);
  const smoothRef = useRef(0);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  const activePosition = useMemo(
    () => getSeatPosition(activeSeatIndex),
    [activeSeatIndex],
  );

  useFrame((_, delta) => {
    if (!spotRef.current) return;

    const target = viewProgressRef.current ?? 0;
    smoothRef.current = reducedMotion
      ? target
      : THREE.MathUtils.damp(smoothRef.current, target, 5.5, delta);
    const t = smoothStep(smoothRef.current);
    const focusT = focusProgressRef?.current ?? 0;
    const focusCameraT = getFocusCameraT(focusT);
    const scenePresence = getFocusScenePresence(focusT);
    const heroPosition = getUserSeatHeroPosition(focusT);

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.04, 0.12, scenePresence);
    }
    if (keyLightRef.current) {
      keyLightRef.current.intensity = THREE.MathUtils.lerp(0.08, 0.35, scenePresence);
    }

    const seatTarget = new THREE.Vector3(
      activePosition[0],
      activePosition[1] + 0.8,
      activePosition[2],
    );
    const topTarget = new THREE.Vector3(0, 0, 0);
    const heroTarget = new THREE.Vector3(heroPosition[0], 0.52, heroPosition[2]);

    spotTarget.position.lerpVectors(seatTarget, topTarget, t);
    spotTarget.position.lerp(heroTarget, focusCameraT);

    const seatLightPos = new THREE.Vector3(
      activePosition[0] * 0.3,
      4.5,
      activePosition[2] * 0.3 + 2.5,
    );
    const topLightPos = new THREE.Vector3(0, 6.5, 0.5);
    const heroLightPos = new THREE.Vector3(0.35, 4.9, 5.9);
    spotRef.current.position.lerpVectors(seatLightPos, topLightPos, t);
    spotRef.current.position.lerp(heroLightPos, focusCameraT);

    if (!reducedMotion && t < 0.85 && focusCameraT < 0.2) {
      breatheRef.current += delta;
      spotRef.current.intensity = 18 + Math.sin(breatheRef.current * 2) * 1.5;
    } else {
      spotRef.current.intensity = THREE.MathUtils.lerp(18, 24, Math.max(t, focusCameraT));
    }

    spotRef.current.target = spotTarget;
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 10, 22]} />
      <ambientLight ref={ambientRef} intensity={0.12} />
      <directionalLight
        ref={keyLightRef}
        position={[3, 7, 2]}
        intensity={0.35}
        color="#fff2e8"
        castShadow
      />
      <directionalLight position={[-2, 4, -3]} intensity={0.08} color="#8888aa" />
      <spotLight
        ref={spotRef}
        angle={0.45}
        penumbra={0.8}
        intensity={18}
        color="#ffd8c0"
        castShadow
      />
      <primitive object={spotTarget} />
      <Environment
        preset="city"
        environmentIntensity={0.15}
      />
    </>
  );
}

function LabelOpacityDriver({
  viewProgressRef,
  centerLabelOpacityRef,
  storyPhase,
  focusProgressRef,
}: {
  viewProgressRef: RefObject<number>;
  centerLabelOpacityRef: RefObject<number>;
  storyPhase: StoryPhase;
  focusProgressRef?: RefObject<number>;
}) {
  const smoothRef = useRef(0);

  useFrame((_, delta) => {
    const target = viewProgressRef.current ?? 0;
    smoothRef.current = THREE.MathUtils.damp(
      smoothRef.current,
      target,
      5.5,
      delta,
    );

    if (storyPhase === "focus" || storyPhase === "form") {
      const focusT = focusProgressRef?.current ?? 0;
      centerLabelOpacityRef.current = Math.max(
        0,
        1 - getFocusSceneFade(focusT),
      );
      return;
    }

    if (storyPhase === "scores" || storyPhase === "average") {
      centerLabelOpacityRef.current = 1;
      return;
    }

    if (storyPhase === "transition") {
      const fadeOut = 1 - smoothStep(Math.max(0, (smoothRef.current - 0.08) / 0.32));
      centerLabelOpacityRef.current = fadeOut;
      return;
    }

    centerLabelOpacityRef.current = 1;
  });

  return null;
}

function SceneRoot({
  activeSeatIndex,
  centerMode,
  showHub,
  showTopicCard,
  showFeedback,
  feedbackRound,
  storyPhase,
  showScores,
  revealedScores,
  averageProgress = 0,
  focusProgress = 0,
  focusProgressRef,
  viewProgressRef,
  reducedMotion = false,
  isMobile = false,
}: TableSceneProps & { isMobile?: boolean }) {
  const centerLabelOpacityRef = useRef(1);

  return (
    <>
      <CameraRig
        viewProgressRef={viewProgressRef}
        focusProgressRef={focusProgressRef}
        isMobile={isMobile}
      />
      <LabelOpacityDriver
        viewProgressRef={viewProgressRef}
        centerLabelOpacityRef={centerLabelOpacityRef}
        storyPhase={storyPhase}
        focusProgressRef={focusProgressRef}
      />
      <SceneLights
        activeSeatIndex={activeSeatIndex}
        viewProgressRef={viewProgressRef}
        focusProgressRef={focusProgressRef}
        reducedMotion={reducedMotion}
      />
      <SceneContent
        activeSeatIndex={activeSeatIndex}
        centerMode={centerMode}
        showHub={showHub}
        showTopicCard={showTopicCard}
        showFeedback={showFeedback}
        feedbackRound={feedbackRound}
        storyPhase={storyPhase}
        showScores={showScores}
        revealedScores={revealedScores}
        averageProgress={averageProgress}
        focusProgress={focusProgress}
        focusProgressRef={focusProgressRef}
        centerLabelOpacityRef={centerLabelOpacityRef}
        isMobile={isMobile}
      />
    </>
  );
}

export function TableScene({
  activeSeatIndex,
  centerMode,
  showHub,
  showTopicCard,
  showFeedback,
  feedbackRound,
  storyPhase,
  showScores,
  revealedScores,
  averageProgress = 0,
  focusProgress = 0,
  focusProgressRef,
  viewProgressRef,
  reducedMotion = false,
}: TableSceneProps) {
  const isMobile = useIsMobile();

  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      dpr={isMobile ? [1, 1.25] : [1, 1.5]}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000", 1);
        gl.shadowMap.type = THREE.PCFShadowMap;
      }}
    >
      <Suspense fallback={null}>
        <SceneRoot
          activeSeatIndex={activeSeatIndex}
          centerMode={centerMode}
          showHub={showHub}
          showTopicCard={showTopicCard}
          showFeedback={showFeedback}
          feedbackRound={feedbackRound}
          storyPhase={storyPhase}
          showScores={showScores}
          revealedScores={revealedScores}
          averageProgress={averageProgress}
          focusProgress={focusProgress}
          focusProgressRef={focusProgressRef}
          viewProgressRef={viewProgressRef}
          reducedMotion={reducedMotion}
          isMobile={isMobile}
        />
      </Suspense>
    </Canvas>
  );
}
