import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles loading and animating the 3D asset
const AvatarModel = ({ modelPath, state }: { modelPath: string, state: 'idle' | 'thinking' | 'speaking' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, scene);

  // Mapped bones for procedural animation
  const headBoneRef = useRef<THREE.Object3D | null>(null);
  const neckBoneRef = useRef<THREE.Object3D | null>(null);
  const spineBoneRef = useRef<THREE.Object3D | null>(null);

  // Track mouse position globally
  const mouseRef = useRef({ x: 0, y: 0, lastMoved: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize coordinate space to [-1, 1]
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.lastMoved = Date.now();
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Map bones once the scene is loaded
  useEffect(() => {
    if (scene) {
      headBoneRef.current = scene.getObjectByName('CC_Base_Head_039') || null;
      neckBoneRef.current = scene.getObjectByName('CC_Base_NeckTwist01_037') || null;
      spineBoneRef.current = scene.getObjectByName('CC_Base_Spine02_036') || null;

      // Reset default rotations
      if (headBoneRef.current) headBoneRef.current.rotation.set(0, 0, 0);
      if (neckBoneRef.current) neckBoneRef.current.rotation.set(0, 0, 0);
      if (spineBoneRef.current) spineBoneRef.current.rotation.set(0, 0, 0);
    }
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

  // Procedural animation loop running after the default mixer updates (priority 1)
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();

    if (group.current) {
      // Subtle float offset in Y - set to -3.1 for a balanced vertical framing
      group.current.position.y = -3.1 + Math.sin(time * 0.5) * 0.05;
      // Soft floating yaw sway
      group.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }

    // Gentle chest expansion (breathing) mapped to the Spine bone
    if (spineBoneRef.current) {
      const breathing = Math.sin(time * 1.5) * 0.015;
      spineBoneRef.current.rotation.x = breathing;
    }

    // Determine target head angles based on mouse tracking or random sways
    let targetHeadYaw = 0;
    let targetHeadPitch = 0;
    let targetHeadRoll = 0;

    const now = Date.now();
    const isMouseActive = now - mouseRef.current.lastMoved < 4000; // active in last 4 seconds

    if (state === 'thinking') {
      // Thinking state: Analytical gaze, looking upward and slightly to the left
      targetHeadYaw = -0.25 + Math.sin(time * 0.2) * 0.03;
      targetHeadPitch = 0.22 + Math.cos(time * 0.15) * 0.02;
      targetHeadRoll = -0.12;
    } else if (state === 'speaking') {
      // Speaking state: Nodding bob cycles simulating speech rhythm
      const vocalBob = Math.sin(time * 4.5) * 0.05 + Math.cos(time * 8) * 0.02;
      const conversationalSway = Math.sin(time * 1.3) * 0.06;

      targetHeadYaw = conversationalSway;
      targetHeadPitch = -0.04 + vocalBob;
      targetHeadRoll = Math.sin(time * 2.2) * 0.03;
    } else {
      // Idle state: Mouse tracking or organic look-around
      if (isMouseActive) {
        // Track the mouse cursor
        targetHeadYaw = mouseRef.current.x * 0.55;  // horizontal turn range
        targetHeadPitch = mouseRef.current.y * 0.35; // vertical look range
        targetHeadRoll = mouseRef.current.x * 0.08;  // subtle roll on turn
      } else {
        // Organic idle gaze drift
        targetHeadYaw = Math.sin(time * 0.25) * 0.12 + Math.cos(time * 0.11) * 0.08;
        targetHeadPitch = Math.cos(time * 0.22) * 0.06 + Math.sin(time * 0.08) * 0.04;
        targetHeadRoll = targetHeadYaw * 0.08;
      }
    }

    // Smoothly interpolate (LERP) bone rotations for fluid, lifelike movements
    if (headBoneRef.current) {
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, targetHeadYaw, 0.06);
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, targetHeadPitch, 0.06);
      headBoneRef.current.rotation.z = THREE.MathUtils.lerp(headBoneRef.current.rotation.z, targetHeadRoll, 0.06);
    }

    if (neckBoneRef.current) {
      // Neck follows head motion with slightly reduced range
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(neckBoneRef.current.rotation.y, targetHeadYaw * 0.25, 0.06);
      neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(neckBoneRef.current.rotation.x, targetHeadPitch * 0.25, 0.06);
    }

    // IMPORTANT: Since we specified a positive render loop priority (1),
    // we must manually trigger the WebGL renderer after all our bone updates.
    threeState.gl.render(threeState.scene, threeState.camera);
  }, 1);
  
  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        position={[0, 0, 0]} 
        scale={1.5} 
      />
    </group>
  );
};

interface RendererProps {
  assetPath: string; 
  vikiState?: 'idle' | 'thinking' | 'speaking';
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
          camera={{ position: [0, 0.0, 6.2], fov: 40 }} // Adjusted distance and vertical center to capture waist-up perfectly without clipping
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow />
          <pointLight position={[-2, -2, -2]} intensity={0.5} color="#9b5de5" />

          <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial wireframe /></mesh>}>
            <AvatarModel modelPath={assetPath} state={vikiState} />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls 
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

