import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that loads, processes, and animates the 3D realistic female android bust model
const FemaleAndroidModel = ({ modelPath }: { modelPath: string }) => {
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

        // Enable shadows for PBR texture depth
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Setup useAnimations hook to handle built-in female idle animations
  const { actions } = useAnimations(animations, sceneRef);

  // Dynamic skeletal bone mapping for custom procedural overlays
  const bonesRef = useRef<{
    neck?: THREE.Bone;
    head?: THREE.Bone;
    leftClavicle?: THREE.Bone;
    rightClavicle?: THREE.Bone;
  }>({});

  // Resolve Rigged female character bones
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    scene.traverse((child) => {
      if ((child as any).isBone) {
        const name = child.name.toLowerCase();
        // Neck/Head bones
        if (name.includes('neck')) bones.neck = child as THREE.Bone;
        if (name.includes('head')) bones.head = child as THREE.Bone;
        // Clavicle/Shoulder bones
        if (name.includes('clavicle_l') || name.includes('shoulder_l') || name.includes('clavicle.l')) bones.leftClavicle = child as THREE.Bone;
        if (name.includes('clavicle_r') || name.includes('shoulder_r') || name.includes('clavicle.r')) bones.rightClavicle = child as THREE.Bone;
      }
    });
    bonesRef.current = bones;
  }, [scene]);

  // Play the built-in natural breathing animation of the female android
  useEffect(() => {
    if (!actions) return;

    // The female model contains a beautiful realistic Idle breathing animation
    const idleAction = actions['Idle02_F'];
    if (idleAction) {
      idleAction.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  // Procedural mouse gaze-tracking overlays in useFrame
  useFrame((threeState) => {
    const bones = bonesRef.current;
    if (!bones) return;

    const pointer = threeState.pointer;
    const targetX = pointer.x * 0.28; // Horizontal limit
    const targetY = pointer.y * 0.20; // Vertical limit

    // Apply smooth look-at gaze targeting on top of active clip loops
    if (bones.head) {
      bones.head.rotation.y = THREE.MathUtils.lerp(bones.head.rotation.y, targetX * 0.45, 0.08);
      bones.head.rotation.x = THREE.MathUtils.lerp(bones.head.rotation.x, -targetY * 0.35, 0.08);
    }
    if (bones.neck) {
      bones.neck.rotation.y = THREE.MathUtils.lerp(bones.neck.rotation.y, targetX * 0.20, 0.08);
      bones.neck.rotation.x = THREE.MathUtils.lerp(bones.neck.rotation.x, -targetY * 0.15, 0.08);
    }
  });

  return (
    <group ref={group}>
      <primitive
        object={scene}
        position={[0, -1.65, 0]} // Torso positioned to render beautiful chest/head female bust framing
        scale={0.01} // Scale down by 100x since the model was exported in centimeters (208 units tall)
      />
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    // Default gorgeous ice-blue cybernetic glow
    const targetColor = new THREE.Color('#80c0ff');
    let targetIntensity = 1.2;
    
    if (state === 'alert') {
      targetColor.set('#ff3050'); // Alarm Crimson Red
      targetIntensity = 2.4 + Math.sin(time * 18.0) * 0.8;
    } else if (state === 'thinking') {
      targetColor.set('#00e5ff'); // Electric Cyan
      targetIntensity = 1.4 + Math.sin(time * 3.5) * 0.3;
    } else if (state === 'speaking') {
      targetColor.set('#3b82f6'); // Conversational Blue
      targetIntensity = 1.8 + Math.sin(time * 10.0) * 0.45;
    } else {
      // Calm organic breathing pulse
      targetIntensity = 1.1 + Math.sin(time * 1.2) * 0.15;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-1.8, 1.2, 2.0]} />;
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
        overflow: 'hidden',
        background: '#040711' // Futuristic dark sci-fi viewport void
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas 
          camera={{ position: [0, 0.1, 1.15], fov: 38 }} // Cinematic close-up bust framing focusing on head and shoulders
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          {/* Detailed premium PBR studio lighting setup */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 2.5]} intensity={1.8} castShadow />
          <directionalLight position={[-3, 1.5, -2.5]} intensity={0.65} color="#4b5563" /> {/* Backlight contour */}
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <FemaleAndroidModel modelPath={assetPath} />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls 
            target={[0, 0, 0]} // Focus centered exactly on the head and chest bust projection
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.7} 
            minPolarAngle={Math.PI / 2.3} 
          />
        </Canvas>
      </div>
    </div>
  );
};

// Preload the female android asset to prevent initialization delays
useGLTF.preload('/assets/viki_android_real.glb');
