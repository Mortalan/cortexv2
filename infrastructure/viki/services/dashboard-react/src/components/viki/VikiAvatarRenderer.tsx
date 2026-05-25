import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles loading, styling as a hologram, and animating the rigged 3D asset
const AvatarModel = ({ modelPath, state }: { modelPath: string; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // Dynamic state-based materials for solid body and wireframe overlays
  const materials = React.useMemo(() => {
    let solidColor = '#60a0ff';
    let wireColor = '#a0c8ff';
    let solidOpacity = 0.08;
    let wireOpacity = 0.28;

    if (state === 'alert') {
      solidColor = '#ff3050';
      wireColor = '#ff4d6a';
      solidOpacity = 0.12;
      wireOpacity = 0.42;
    } else if (state === 'speaking') {
      solidColor = '#a0d8ff';
      wireColor = '#d0f5ff';
      solidOpacity = 0.09;
      wireOpacity = 0.35;
    } else if (state === 'thinking') {
      solidColor = '#00e5ff';
      wireColor = '#00a2ff';
      solidOpacity = 0.10;
      wireOpacity = 0.32;
    }

    const solidMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(solidColor),
      transparent: true,
      opacity: solidOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(wireColor),
      wireframe: true,
      transparent: true,
      opacity: wireOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    return { solidMat, wireframeMat };
  }, [state]);

  // Convert to non-indexed geometry to bypass WebGL index underflow driver bugs in Firefox on Linux.
  // We also clone skinned meshes to create a dual-layer holographic solid core + glowing wireframe outline in perfect sync.
  React.useMemo(() => {
    // 1. Clean up existing clones first to prevent duplicates when materials are re-evaluated
    const existingClones: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name && child.name.endsWith('_wireframe_clone')) {
        existingClones.push(child);
      }
    });
    existingClones.forEach((clone) => {
      if (clone.parent) {
        clone.parent.remove(clone);
      }
    });

    // 2. Traverse and convert geometry, applying solid materials and building skinned wireframe clones
    scene.traverse((child) => {
      if ((child as any).isMesh && !child.name.endsWith('_wireframe_clone')) {
        const mesh = child as THREE.Mesh;
        
        // Ensure matrices auto update
        mesh.matrixAutoUpdate = true;

        // Strip geometry index for Linux graphics driver stability
        if (mesh.geometry && mesh.geometry.index) {
          mesh.geometry = mesh.geometry.toNonIndexed();
        }

        // Apply core solid translucent holographic material
        mesh.material = materials.solidMat;

        // Create high-contrast wireframe overlay clone
        const clone = mesh.clone();
        clone.name = mesh.name + '_wireframe_clone';
        clone.material = materials.wireframeMat;

        // If mesh is rigged, bind the skinned clone to the exact same skeleton to sync animations
        if ((mesh as any).isSkinnedMesh) {
          const skinnedMesh = mesh as THREE.SkinnedMesh;
          const skinnedClone = clone as THREE.SkinnedMesh;
          skinnedClone.bind(skinnedMesh.skeleton, skinnedMesh.bindMatrix);
        }

        // Add the clone to the same parent group
        if (mesh.parent) {
          mesh.parent.add(clone);
        }
      }
    });
  }, [scene, materials]);

  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Setup useAnimations hooks to play GLB built-in skeletal clips
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
    jaw?: THREE.Bone;
  }>({});

  // Resolve Rigged character bones (including CC_Base facial bones from inspection)
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    scene.traverse((child) => {
      if ((child as any).isBone) {
        const name = child.name.toLowerCase();
        // Eye bones
        if (name.includes('lefteye') || name === 'eye_l' || name.includes('eye.l') || name.includes('l_eye')) bones.leftEye = child as THREE.Bone;
        if (name.includes('righteye') || name === 'eye_r' || name.includes('eye.r') || name.includes('r_eye')) bones.rightEye = child as THREE.Bone;
        // Clavicle bones
        if (name.includes('leftclavicle') || name.includes('clavicle_l') || name.includes('clavicle.l') || name.includes('l_clavicle')) bones.leftClavicle = child as THREE.Bone;
        if (name.includes('rightclavicle') || name.includes('clavicle_r') || name.includes('clavicle.r') || name.includes('r_clavicle')) bones.rightClavicle = child as THREE.Bone;
        // Arm bones
        if (name.includes('leftupperarm') || name.includes('upperarm_l') || name.includes('upper_arm_l') || name.includes('arm_l') || name.includes('shoulder_l') || name.includes('l_upperarm')) bones.leftUpperArm = child as THREE.Bone;
        if (name.includes('rightupperarm') || name.includes('upperarm_r') || name.includes('upper_arm_r') || name.includes('arm_r') || name.includes('shoulder_r') || name.includes('r_upperarm')) bones.rightUpperArm = child as THREE.Bone;
        if (name.includes('leftforearm') || name.includes('forearm_l') || name.includes('fore_arm_l') || name.includes('l_forearm')) bones.leftForearm = child as THREE.Bone;
        if (name.includes('rightforearm') || name.includes('forearm_r') || name.includes('fore_arm_r') || name.includes('r_forearm')) bones.rightForearm = child as THREE.Bone;
        // Neck/Head/Spine bones
        if (name.includes('neck')) bones.neck = child as THREE.Bone;
        if (name.includes('head')) bones.head = child as THREE.Bone;
        if (name.includes('spine')) bones.spine = child as THREE.Bone;
        // Jaw root bone
        if (name.includes('jaw') || name.includes('cc_base_jawroot')) bones.jaw = child as THREE.Bone;
      }
    });
    bonesRef.current = bones;
  }, [scene]);

  // Play natural idle animation clip
  useEffect(() => {
    if (!actions) return;
    const firstAnimKey = Object.keys(actions)[0];
    const action = actions[firstAnimKey];
    if (action) {
      action.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  // Kinetic state trackers
  const waveTimer = useRef(0);
  const lastState = useRef(state);
  const lastAlertState = useRef(false);
  const joltTime = useRef(0);

  // Advanced procedural movements inside the R3F draw loop
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();

    // 1. Root group organic bobbing & floating sway
    if (group.current) {
      group.current.position.y = -3.35 + Math.sin(time * 0.45) * 0.015;
      group.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }

    const bones = bonesRef.current;
    if (!bones) return;

    // Speech amplitude / syllable wave calculator
    let amplitude = 0;
    if (state === 'speaking') {
      const syllableMod = 0.5 + Math.sin(time * 8.0) * 0.35 + Math.sin(time * 22.0) * 0.15;
      amplitude = Math.max(0.0, syllableMod);
    } else if (state === 'thinking') {
      amplitude = 0.08 + Math.sin(time * 18.0) * 0.04;
    }

    // 2. Procedural Eye Tracking (Mouse Gaze)
    const pointer = threeState.pointer;
    const targetX = pointer.x * 0.32; // Horizontal gaze limit
    const targetY = pointer.y * 0.22; // Vertical gaze limit

    if (bones.leftEye) {
      bones.leftEye.rotation.y = THREE.MathUtils.lerp(bones.leftEye.rotation.y, targetX, 0.12);
      bones.leftEye.rotation.x = THREE.MathUtils.lerp(bones.leftEye.rotation.x, -targetY, 0.12);
    }
    if (bones.rightEye) {
      bones.rightEye.rotation.y = THREE.MathUtils.lerp(bones.rightEye.rotation.y, targetX, 0.12);
      bones.rightEye.rotation.x = THREE.MathUtils.lerp(bones.rightEye.rotation.x, -targetY, 0.12);
    }
    // Head and neck mimic gaze slightly for compliance
    if (bones.head) {
      bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetX * 0.42, 0.08);
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, -targetY * 0.32, 0.08);
    }
    if (bones.neck) {
      bones.neck.rotation.y = THREE.MathUtils.lerp(bones.neck.rotation.y, targetX * 0.22, 0.08);
      bones.neck.rotation.x = THREE.MathUtils.lerp(bones.neck.rotation.x, -targetY * 0.18, 0.08);
    }

    // 3. State-based Clavicle & Spine Breathing Cycles
    let breathingSpeed = 1.4;
    let breathingAmplitude = 0.018;

    if (state === 'alert') {
      breathingSpeed = 3.2; // Rapid shallow combat breathing
      breathingAmplitude = 0.04;
    } else if (state === 'thinking') {
      breathingSpeed = 0.7; // Meditative deep breathing
      breathingAmplitude = 0.012;
    } else if (state === 'speaking') {
      breathingSpeed = 1.9;
      breathingAmplitude = 0.022;
    }

    const breathingValue = Math.sin(time * breathingSpeed) * breathingAmplitude;

    if (bones.leftClavicle) {
      bones.leftClavicle.rotation.z = THREE.MathUtils.lerp(bones.leftClavicle.rotation.z, breathingValue, 0.1);
    }
    if (bones.rightClavicle) {
      bones.rightClavicle.rotation.z = THREE.MathUtils.lerp(bones.rightClavicle.rotation.z, -breathingValue, 0.1);
    }
    if (bones.spine) {
      bones.spine.rotation.x = THREE.MathUtils.lerp(bones.spine.rotation.x, breathingValue * 0.18, 0.1);
    }

    // 4. Voice-reactive Jaw Visemes (CC_Base_JawRoot_041)
    if (bones.jaw) {
      let targetJawX = 0;
      if (state === 'speaking') {
        // syllabic jaw oscillations
        targetJawX = amplitude * 0.22 * Math.abs(Math.sin(time * 14.0));
      }
      bones.jaw.rotation.x = THREE.MathUtils.lerp(bones.jaw.rotation.x, targetJawX, 0.15);
    }

    // 5. Speech micro-shiver vibrations & volumetric scale kinetics (V.I.K.I. style undulations)
    if (bones.head) {
      let vocalScale = 1.0;
      let microShiver = 0;

      if (state === 'speaking') {
        vocalScale = 1.0 + amplitude * 0.035 * Math.sin(time * 12.0);
        microShiver = Math.sin(time * 48.0) * amplitude * 0.006;
      } else if (state === 'thinking') {
        vocalScale = 1.0 + Math.sin(time * 18.0) * 0.008;
      }

      // Dynamic scale pulsation
      bones.head.scale.set(vocalScale, vocalScale, vocalScale);

      // Micro shivering displacement
      bones.head.position.x = microShiver;
      bones.head.position.y = microShiver * 0.5;
    }

    // 6. Speaking-Triggered Wave Greeting
    if (state === 'speaking' && lastState.current !== 'speaking') {
      waveTimer.current = time;
    }
    lastState.current = state;

    let targetRightArmZ = 0;
    let targetRightForearmY = 0;
    let targetRightForearmX = 0;

    const elapsedWave = time - waveTimer.current;
    if (state === 'speaking' && elapsedWave < 4.5) {
      targetRightArmZ = -1.5; // Raise arm
      targetRightForearmY = 0.4 + Math.sin(time * 11.0) * 0.45; // Wave hand
      targetRightForearmX = 0.35;
    } else {
      if (state === 'alert') {
        targetRightArmZ = -0.12; // Hold arm closer
      } else {
        targetRightArmZ = 0;
      }
    }

    if (bones.rightUpperArm) {
      bones.rightUpperArm.rotation.z = THREE.MathUtils.lerp(bones.rightUpperArm.rotation.z, targetRightArmZ, 0.08);
    }
    if (bones.rightForearm) {
      bones.rightForearm.rotation.y = THREE.MathUtils.lerp(bones.rightForearm.rotation.y, targetRightForearmY, 0.08);
      bones.rightForearm.rotation.x = THREE.MathUtils.lerp(bones.rightForearm.rotation.x, targetRightForearmX, 0.08);
    }

    // 7. Alert-Triggered Security Jolt Spasm (sudden full skeleton contract)
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

// Double-layer counter-rotating outer wireframe box enclosure centered around the face
const HolographicVIKICube = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const outerCubeRef1 = useRef<THREE.Mesh>(null);
  const outerCubeRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (outerCubeRef1.current) {
      outerCubeRef1.current.rotation.y = time * 0.14;
      outerCubeRef1.current.rotation.x = time * 0.06;
    }
    if (outerCubeRef2.current) {
      outerCubeRef2.current.rotation.y = -time * 0.08;
      outerCubeRef2.current.rotation.z = time * 0.11;
    }
  });
  
  let color = '#a0d8ff'; 
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#d0f5ff';
  
  return (
    <group position={[0, -1.35, 0]}>
      {/* Primary Cube Cage */}
      <mesh ref={outerCubeRef1}>
        <boxGeometry args={[4.4, 4.4, 4.4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.06} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Secondary Inner Cage for Parallax Depth */}
      <mesh ref={outerCubeRef2} scale={0.96}>
        <boxGeometry args={[4.4, 4.4, 4.4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.03} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// Cyber particles matrix floating around the face
const CyberParticles = ({ count = 55, state }: { count?: number; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5.2;          // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.8 - 1.35; // y centered around head
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;       // z
    }
    return pos;
  }, [count]);

  useFrame((threeState) => {
    if (!pointsRef.current) return;
    const time = threeState.clock.getElapsedTime();
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let speed = 0.008;
    if (state === 'alert') speed = 0.025;
    else if (state === 'thinking') speed = 0.005;
    else if (state === 'speaking') speed = 0.014;

    for (let i = 0; i < count; i++) {
      // Float upwards
      array[i * 3 + 1] += speed;
      // Reset if floated out of screen boundaries
      if (array[i * 3 + 1] > 1.8) {
        array[i * 3 + 1] = -4.5;
        array[i * 3] = (Math.random() - 0.5) * 5.2;
      }
      // Horizontal sinusoidal sway
      array[i * 3] += Math.sin(time * 0.95 + i) * 0.0035;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  let color = '#a0d8ff';
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#d0f5ff';

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
        size={0.045}
        transparent
        opacity={0.45}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Translucent glowing grid platform below the entity
const HolographicPlatform = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const gridRef = useRef<THREE.GridHelper>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    
    if (gridRef.current) {
      gridRef.current.rotation.y = time * 0.04;
      const mat = gridRef.current.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.15;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = -time * 0.05;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = time * 0.08;
    }
  });

  let color = '#80c0ff';
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#a0d8ff';

  return (
    <group position={[0, -3.5, 0]}>
      {/* Dynamic Cyber Grid */}
      <gridHelper ref={gridRef} args={[7.0, 16, color, color]} />
      
      {/* Outer cyber ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.0, 2.15, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.22} transparent wireframe />
      </mesh>
      
      {/* Inner cyber ring */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.9, 0.96, 24]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.18} transparent wireframe />
      </mesh>
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    const targetColor = new THREE.Color('#80c0ff');
    let targetIntensity = 0.7;
    
    if (state === 'alert') {
      targetColor.set('#ff3050');
      targetIntensity = 1.4 + Math.sin(time * 18.0) * 0.45;
    } else if (state === 'thinking') {
      targetColor.set('#00e5ff');
      targetIntensity = 0.8 + Math.sin(time * 3.5) * 0.15;
    } else if (state === 'speaking') {
      targetColor.set('#d0f5ff');
      targetIntensity = 1.0 + Math.sin(time * 11.0) * 0.28;
    } else {
      targetIntensity = 0.6 + Math.sin(time * 1.2) * 0.08;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-2, 1, 2.5]} />;
};

interface RendererProps {
  assetPath?: string; 
  vikiState?: 'idle' | 'thinking' | 'speaking' | 'alert';
}

export const VikiAvatarRenderer: React.FC<RendererProps> = ({ assetPath = '/assets/viki_android_real.glb', vikiState = 'idle' }) => {
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
          camera={{ position: [0, -0.5, 7.8], fov: 40 }} // Beautiful framing perfectly alignment
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 3]} intensity={1.3} castShadow />
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <HolographicVIKICube state={vikiState} />
            <AvatarModel modelPath={assetPath} state={vikiState} />
            <Environment preset="city" />
            <CyberParticles state={vikiState} />
            <HolographicPlatform state={vikiState} />
          </Suspense>

          <OrbitControls 
            target={[0, -1.35, 0]} // Perfect head centering height
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

// Preload the GLTF local assets to ensure zero-lag instantiation
useGLTF.preload('/assets/viki_android_real.glb');
