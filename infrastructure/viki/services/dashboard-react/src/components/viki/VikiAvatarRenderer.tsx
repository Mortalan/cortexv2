import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that loads, processes, and animates the high-fidelity 3D female android/human bust
const FemaleModel = ({ modelPath }: { modelPath: string }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // Convert to non-indexed geometry to bypass WebGL index underflows in Firefox on Linux
  React.useMemo(() => {
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.matrixAutoUpdate = true;
        
        // Strip geometry index for Linux Mesa stability
        if (mesh.geometry && mesh.geometry.index) {
          mesh.geometry = mesh.geometry.toNonIndexed();
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Setup useAnimations hook to handle built-in idle breathing loops
  const { actions } = useAnimations(animations, sceneRef);

  // Dynamic skeletal bone mapping
  const bonesRef = useRef<{
    neck?: THREE.Bone;
    head?: THREE.Bone;
  }>({});

  // Resolve Rigged female character bones
  useEffect(() => {
    const bones: typeof bonesRef.current = {};
    scene.traverse((child) => {
      if ((child as any).isBone) {
        const name = child.name.toLowerCase();
        if (name.includes('neck')) bones.neck = child as THREE.Bone;
        if (name.includes('head')) bones.head = child as THREE.Bone;
      }
    });
    bonesRef.current = bones;
  }, [scene]);

  // Dynamic self-centering of the head in world coordinates
  const [offset, setOffset] = useState<[number, number, number]>([0, -1.65, 0]);

  useEffect(() => {
    let headBone: THREE.Object3D | null = null;
    scene.traverse((child) => {
      if (child.name.toLowerCase().includes('head') && !headBone) {
        headBone = child;
      }
    });

    if (headBone) {
      const headLocalPos = new THREE.Vector3();
      (headBone as THREE.Object3D).getWorldPosition(headLocalPos);
      
      // Convert head world position to scene local coordinates
      scene.worldToLocal(headLocalPos);
      
      // We scale the model by 0.01
      const scale = 0.01;
      
      // Offset position of model relative to parent group so the head is centered at y = 0.05
      setOffset([
        -headLocalPos.x * scale,
        -headLocalPos.y * scale + 0.05,
        -headLocalPos.z * scale
      ]);
    }
  }, [scene]);

  // Play the organic breathing idle loop
  useEffect(() => {
    if (!actions) return;
    const idleAction = actions['Idle02_F'];
    if (idleAction) {
      idleAction.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  // Smooth mouse cursor gaze-tracking overlays in useFrame
  useFrame((threeState) => {
    const bones = bonesRef.current;
    if (!bones) return;

    const pointer = threeState.pointer;
    const targetX = pointer.x * 0.28; // Horizontal rotation bounds
    const targetY = pointer.y * 0.20; // Vertical rotation bounds

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
        position={offset}
        scale={0.01} // Scale down by 100x since the high-fidelity model was modeled in centimeters (208cm)
      />
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();

    // Default ice-blue cybernetic glow
    const targetColor = new THREE.Color('#80c0ff');
    let targetIntensity = 1.2;

    if (state === 'alert') {
      targetColor.set('#ff3050');
      targetIntensity = 2.4 + Math.sin(time * 18.0) * 0.8;
    } else if (state === 'thinking') {
      targetColor.set('#00e5ff');
      targetIntensity = 1.4 + Math.sin(time * 3.5) * 0.3;
    } else if (state === 'speaking') {
      targetColor.set('#3b82f6');
      targetIntensity = 1.8 + Math.sin(time * 10.0) * 0.45;
    } else {
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
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 2.5]} intensity={1.8} castShadow />
          <directionalLight position={[-3, 1.5, -2.5]} intensity={0.65} color="#4b5563" />
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <FemaleModel modelPath={assetPath} />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls
            target={[0, 0.05, 0]} // Centered exactly on the head coordinates
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

useGLTF.preload('/assets/viki_android_real.glb');
