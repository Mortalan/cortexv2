import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that loads, processes, and animates the 3D Bishop android bust model
const BishopModel = ({ modelPath, state }: { modelPath: string; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // Convert to non-indexed geometry to bypass WebGL index underflow driver bugs in Firefox on Linux.
  React.useMemo(() => {
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Enable matrix auto update
        mesh.matrixAutoUpdate = true;

        // Strip geometry index for Linux Mesa graphics driver stability
        if (mesh.geometry && mesh.geometry.index) {
          mesh.geometry = mesh.geometry.toNonIndexed();
        }
      }
    });
  }, [scene]);

  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Setup useAnimations hook to handle built-in expressive actions
  const { actions } = useAnimations(animations, sceneRef);

  // Dynamic skeletal bone mapping for custom procedural overlays
  const bonesRef = useRef<{
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

  // Resolve Rigged character bones from our inspection log
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    scene.traverse((child) => {
      if ((child as any).isBone) {
        const name = child.name.toLowerCase();
        // Clavicle / Shoulder bones
        if (name.includes('shoulder.l') || name.includes('shoulder_l')) bones.leftClavicle = child as THREE.Bone;
        if (name.includes('shoulder.r') || name.includes('shoulder_r')) bones.rightClavicle = child as THREE.Bone;
        // Arm bones
        if (name.includes('upperarm.l') || name.includes('upperarm_l')) bones.leftUpperArm = child as THREE.Bone;
        if (name.includes('upperarm.r') || name.includes('upperarm_r')) bones.rightUpperArm = child as THREE.Bone;
        if (name.includes('lowerarm.l') || name.includes('lowerarm_l')) bones.leftForearm = child as THREE.Bone;
        if (name.includes('lowerarm.r') || name.includes('lowerarm_r')) bones.rightForearm = child as THREE.Bone;
        // Neck/Head/Spine bones
        if (name.includes('neck')) bones.neck = child as THREE.Bone;
        if (name.includes('head')) bones.head = child as THREE.Bone;
        if (name.includes('torso') || name.includes('abdomen')) bones.spine = child as THREE.Bone;
      }
    });
    bonesRef.current = bones;
  }, [scene]);

  // Handle playing and crossfading animations based on the agent's active state
  useEffect(() => {
    if (!actions) return;

    // Define target animation based on state
    let targetAnim = 'Standing';
    if (state === 'idle') {
      targetAnim = 'Idle'; // Breathe organically
    } else if (state === 'thinking') {
      targetAnim = 'Standing'; // Attentive posture
    } else if (state === 'speaking') {
      targetAnim = 'Wave'; // Wave greeting
    } else if (state === 'alert') {
      targetAnim = 'No'; // Alarm warning head shake
    }

    // Crossfade to the target animation smoothly
    const currentAction = actions[targetAnim];
    if (currentAction) {
      // Fade out all other playing clips
      Object.keys(actions).forEach((key) => {
        if (key !== targetAnim) {
          actions[key]?.fadeOut(0.35);
        }
      });

      // Play target animation
      currentAction.reset().fadeIn(0.35).play();
    }
  }, [actions, state]);

  // Procedural mouse gaze-tracking overlays in useFrame
  useFrame((threeState) => {
    const bones = bonesRef.current;
    if (!bones) return;

    const pointer = threeState.pointer;
    const targetX = pointer.x * 0.35; // Horizontal limit
    const targetY = pointer.y * 0.25; // Vertical limit

    // Apply smooth look-at gaze targeting on top of active clip loops
    if (bones.head) {
      bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetX * 0.52, 0.08);
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, -targetY * 0.42, 0.08);
    }
    if (bones.neck) {
      bones.neck.rotation.y = THREE.MathUtils.lerp(bones.neck.rotation.y, targetX * 0.26, 0.08);
      bones.neck.rotation.x = THREE.MathUtils.lerp(bones.neck.rotation.x, -targetY * 0.22, 0.08);
    }
  });

  return (
    <group ref={group}>
      <primitive
        object={scene}
        position={[0, -1.82, 0]} // Torso positioned to render chest/head bust framing
        scale={1.75} // Perfectly scaled for high impact
      />
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    const targetColor = new THREE.Color('#80c0ff');
    let targetIntensity = 1.0;
    
    if (state === 'alert') {
      targetColor.set('#ff3050');
      targetIntensity = 2.0 + Math.sin(time * 18.0) * 0.6;
    } else if (state === 'thinking') {
      targetColor.set('#00e5ff');
      targetIntensity = 1.2 + Math.sin(time * 3.5) * 0.2;
    } else if (state === 'speaking') {
      targetColor.set('#3b82f6');
      targetIntensity = 1.5 + Math.sin(time * 10.0) * 0.35;
    } else {
      // Calm breathing glow
      targetIntensity = 0.9 + Math.sin(time * 1.2) * 0.1;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-2.5, 1.5, 3.0]} />;
};

interface RendererProps {
  assetPath?: string; 
  vikiState?: 'idle' | 'thinking' | 'speaking' | 'alert';
}

export const VikiAvatarRenderer: React.FC<RendererProps> = ({ assetPath = '/assets/bishop_android.glb', vikiState = 'idle' }) => {
  return (
    <div 
      className="viki-canvas-wrapper" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        minHeight: '400px', 
        overflow: 'hidden',
        background: '#040711' // Futuristic dark sci-fi viewport void
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas 
          camera={{ position: [0, 0, 3.2], fov: 40 }} // Cinematic bust framing
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          {/* Detailed studio lighting void setup */}
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 5, 4]} intensity={2.0} castShadow />
          <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#4b5563" /> {/* Backlight contour */}
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <BishopModel modelPath={assetPath} state={vikiState} />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls 
            target={[0, -0.22, 0]} // Centered focus on the chest/head bust projection
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.6} 
            minPolarAngle={Math.PI / 2.4} 
          />
        </Canvas>
      </div>
    </div>
  );
};

// Preload the new Bishop model asset to prevent initialization delays
useGLTF.preload('/assets/bishop_android.glb');
