import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles loading and animating the 3D asset
const AvatarModel = ({ modelPath, state }: { modelPath: string; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const { actions } = useAnimations(animations, sceneRef);

  // Dynamic skeletal bone mapping
  const bonesRef = useRef<{
    leftEye?: THREE.Bone;
    rightEye?: THREE.Bone;
    leftClavicle?: THREE.Bone;
    rightClavicle?: THREE.Bone;
    leftUpperArm?: THREE.Bone;
    rightUpperArm?: THREE.Bone;
    leftForearm?: THREE.Bone;
    rightForearm?: THREE.Bone;
    neck?: THREE.Bone;
    head?: THREE.Bone;
    spine?: THREE.Bone;
  }>({});

  // Dynamic skeletal traversal to resolve RIG naming variations
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    scene.traverse((child) => {
      if ((child as any).isBone) {
        const name = child.name.toLowerCase();
        // Eye bones
        if (name.includes('lefteye') || name === 'eye_l' || name.includes('eye.l')) bones.leftEye = child as THREE.Bone;
        if (name.includes('righteye') || name === 'eye_r' || name.includes('eye.r')) bones.rightEye = child as THREE.Bone;
        // Clavicle bones
        if (name.includes('leftclavicle') || name.includes('clavicle_l') || name.includes('clavicle.l')) bones.leftClavicle = child as THREE.Bone;
        if (name.includes('rightclavicle') || name.includes('clavicle_r') || name.includes('clavicle.r')) bones.rightClavicle = child as THREE.Bone;
        // Arm bones
        if (name.includes('leftupperarm') || name.includes('upperarm_l') || name.includes('upper_arm_l') || name.includes('arm_l') || name.includes('shoulder_l')) bones.leftUpperArm = child as THREE.Bone;
        if (name.includes('rightupperarm') || name.includes('upperarm_r') || name.includes('upper_arm_r') || name.includes('arm_r') || name.includes('shoulder_r')) bones.rightUpperArm = child as THREE.Bone;
        if (name.includes('leftforearm') || name.includes('forearm_l') || name.includes('fore_arm_l')) bones.leftForearm = child as THREE.Bone;
        if (name.includes('rightforearm') || name.includes('forearm_r') || name.includes('fore_arm_r')) bones.rightForearm = child as THREE.Bone;
        // Neck/Head/Spine bones
        if (name.includes('neck')) bones.neck = child as THREE.Bone;
        if (name.includes('head')) bones.head = child as THREE.Bone;
        if (name.includes('spine')) bones.spine = child as THREE.Bone;
      }
    });
    bonesRef.current = bones;
  }, [scene]);

  // Handle playing the basic embedded body animation
  useEffect(() => {
    if (!actions) return;
    
    // Play the default first animation clip since there is only one index (Idle02_F)
    const firstAnimKey = Object.keys(actions)[0];
    const action = actions[firstAnimKey];
    if (action) {
      action.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  // Kinetic animation timers & state trackers
  const waveTimer = useRef(0);
  const lastState = useRef(state);
  const lastAlertState = useRef(false);
  const joltTime = useRef(0);

  // Advanced procedural animations on useFrame R3F loop
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    
    // 1. Root group floating bobbing and yaw sway
    if (group.current) {
      group.current.position.y = -3.35 + Math.sin(time * 0.4) * 0.015;
      group.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }

    const bones = bonesRef.current;
    if (!bones) return;

    // 2. Procedural Eye Tracking (Gaze)
    const pointer = threeState.pointer;
    const targetX = pointer.x * 0.35; // Horizontal limit
    const targetY = pointer.y * 0.25; // Vertical limit

    if (bones.leftEye) {
      bones.leftEye.rotation.y = THREE.MathUtils.lerp(bones.leftEye.rotation.y, targetX, 0.1);
      bones.leftEye.rotation.x = THREE.MathUtils.lerp(bones.leftEye.rotation.x, -targetY, 0.1);
    }
    if (bones.rightEye) {
      bones.rightEye.rotation.y = THREE.MathUtils.lerp(bones.rightEye.rotation.y, targetX, 0.1);
      bones.rightEye.rotation.x = THREE.MathUtils.lerp(bones.rightEye.rotation.x, -targetY, 0.1);
    }
    // Head and neck mimic gaze slightly for physical compliance
    if (bones.head) {
      bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetX * 0.4, 0.08);
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, -targetY * 0.3, 0.08);
    }
    if (bones.neck) {
      bones.neck.rotation.y = THREE.MathUtils.lerp(bones.neck.rotation.y, targetX * 0.2, 0.08);
      bones.neck.rotation.x = THREE.MathUtils.lerp(bones.neck.rotation.x, -targetY * 0.15, 0.08);
    }

    // 3. State-based Clavicle & Spine Breathing Cycles
    let breathingSpeed = 1.4;
    let breathingAmplitude = 0.02;

    if (state === 'alert') {
      breathingSpeed = 3.0; // Rapid combat breathing
      breathingAmplitude = 0.045;
    } else if (state === 'thinking') {
      breathingSpeed = 0.8; // Meditative deep breathing
      breathingAmplitude = 0.015;
    } else if (state === 'speaking') {
      breathingSpeed = 1.8;
      breathingAmplitude = 0.025;
    }

    const breathingValue = Math.sin(time * breathingSpeed) * breathingAmplitude;

    if (bones.leftClavicle) {
      bones.leftClavicle.rotation.z = THREE.MathUtils.lerp(bones.leftClavicle.rotation.z, breathingValue, 0.1);
    }
    if (bones.rightClavicle) {
      bones.rightClavicle.rotation.z = THREE.MathUtils.lerp(bones.rightClavicle.rotation.z, -breathingValue, 0.1);
    }
    if (bones.spine) {
      bones.spine.rotation.x = THREE.MathUtils.lerp(bones.spine.rotation.x, breathingValue * 0.2, 0.1);
    }

    // 4. Speaking-Triggered Hello Wave Greeting
    if (state === 'speaking' && lastState.current !== 'speaking') {
      waveTimer.current = time;
    }
    lastState.current = state;

    let targetRightArmZ = 0;
    let targetRightForearmY = 0;
    let targetRightForearmX = 0;

    const elapsedWave = time - waveTimer.current;
    if (state === 'speaking' && elapsedWave < 4.0) {
      targetRightArmZ = -1.6; // Raised arm
      targetRightForearmY = 0.5 + Math.sin(time * 12.0) * 0.45; // Wave hand
      targetRightForearmX = 0.3;
    } else {
      if (state === 'alert') {
        targetRightArmZ = -0.15; // Hold arm closer to body
      } else {
        targetRightArmZ = 0; // Relaxed / default animation control
      }
    }

    if (bones.rightUpperArm) {
      bones.rightUpperArm.rotation.z = THREE.MathUtils.lerp(bones.rightUpperArm.rotation.z, targetRightArmZ, 0.08);
    }
    if (bones.rightForearm) {
      bones.rightForearm.rotation.y = THREE.MathUtils.lerp(bones.rightForearm.rotation.y, targetRightForearmY, 0.08);
      bones.rightForearm.rotation.x = THREE.MathUtils.lerp(bones.rightForearm.rotation.x, targetRightForearmX, 0.08);
    }

    // 5. Alert-Triggered Security Jolt Spasm (sudden full skeleton contract)
    if (state === 'alert' && !lastAlertState.current) {
      joltTime.current = time;
    }
    lastAlertState.current = (state === 'alert');

    const elapsedJolt = time - joltTime.current;
    if (state === 'alert' && elapsedJolt < 1.0) {
      const joltSpasm = Math.exp(-elapsedJolt * 6.5) * Math.sin(elapsedJolt * 40.0) * 0.18;
      
      if (bones.neck) {
        bones.neck.rotation.x += joltSpasm;
        bones.neck.rotation.z += joltSpasm * 0.4;
      }
      if (bones.spine) {
        bones.spine.rotation.y += joltSpasm * 0.3;
      }
      if (bones.leftClavicle) {
        bones.leftClavicle.rotation.y += joltSpasm * 0.5;
      }
      if (bones.rightClavicle) {
        bones.rightClavicle.rotation.y -= joltSpasm * 0.5;
      }
    }
  });

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        position={[0, 0, 0]} 
        scale={1.05} 
      />
    </group>
  );
};

const CyberParticles = ({ count = 40, state }: { count?: number; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate random positions
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5;          // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6 - 0.5; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;       // z
    }
    return pos;
  }, [count]);

  useFrame((threeState) => {
    if (!pointsRef.current) return;
    const time = threeState.clock.getElapsedTime();
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let speed = 0.006;
    if (state === 'alert') speed = 0.022;
    else if (state === 'thinking') speed = 0.0035;
    else if (state === 'speaking') speed = 0.010;

    for (let i = 0; i < count; i++) {
      // Float upwards
      array[i * 3 + 1] += speed;
      // Reset if float out of screen
      if (array[i * 3 + 1] > 3.0) {
        array[i * 3 + 1] = -3.4;
        array[i * 3] = (Math.random() - 0.5) * 5;
      }
      // Subtle horizontal sway
      array[i * 3] += Math.sin(time * 0.8 + i) * 0.003;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  let color = '#9b5de5';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#ffb703';

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.07}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
};

const HolographicPlatform = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const gridRef = useRef<THREE.GridHelper>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    
    // Rotate the platform slowly
    if (gridRef.current) {
      gridRef.current.rotation.y = time * 0.04;
      const mat = gridRef.current.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.22;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = -time * 0.06;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = time * 0.09;
    }
  });

  // Dynamic colors based on state
  let color = '#9b5de5';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#ffb703';

  return (
    <group position={[0, -3.4, 0]}>
      {/* Coordinate grid */}
      <gridHelper ref={gridRef} args={[7, 18, color, color]} />
      
      {/* Outer Cyber ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.7, 1.85, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.35} transparent wireframe />
      </mesh>
      
      {/* Inner Cyber ring */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.7, 0.76, 24]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.25} transparent wireframe />
      </mesh>
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    let targetColor = new THREE.Color('#9b5de5');
    let targetIntensity = 0.5;
    
    if (state === 'alert') {
      targetColor.set('#ff003c');
      targetIntensity = 0.9 + Math.sin(time * 16) * 0.35; // Rapid heartbeat pulse
    } else if (state === 'thinking') {
      targetColor.set('#00f0ff');
      targetIntensity = 0.45 + Math.sin(time * 2.5) * 0.15; // Slow breathing pulse
    } else if (state === 'speaking') {
      targetColor.set('#ffb703');
      targetIntensity = 0.6 + Math.sin(time * 9) * 0.25; // Energetic chat pulse
    } else {
      // Calm, slow idle breathing pulse
      targetIntensity = 0.4 + Math.sin(time * 0.9) * 0.08;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-2, -1, -1]} />;
};

interface RendererProps {
  assetPath: string; 
  vikiState?: 'idle' | 'thinking' | 'speaking' | 'alert';
}

export const VikiAvatarRenderer: React.FC<RendererProps> = ({ assetPath, vikiState = 'idle' }) => {
  return (
    <div 
      className="viki-canvas-wrapper" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        minHeight: '400px', 
        overflow: 'hidden' 
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas 
          camera={{ position: [0, -0.5, 7.8], fov: 40 }} // Beautifully aligned framing with zero clipping
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow />
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial wireframe /></mesh>}>
            <AvatarModel modelPath={assetPath} state={vikiState} />
            <Environment preset="city" />
            <CyberParticles state={vikiState} />
            <HolographicPlatform state={vikiState} />
          </Suspense>

          <OrbitControls 
            target={[0, -1.35, 0]}
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.5} 
            minPolarAngle={Math.PI / 3} 
          />
        </Canvas>
      </div>
    </div>
  );
};

// Ensure the GLTF loader unloads the asset correctly when unmounting
useGLTF.preload('/assets/viki_android_real.glb');

