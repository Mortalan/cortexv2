import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that loads, compiles, and animates the high-fidelity Sphere Bot model
const SphereBotModel = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  
  // Dynamic GLTF Loader caching the sphere bot model
  const { scene, animations } = useGLTF('/assets/sphere_bot.glb');
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Setup animations using three-stdlib / drei useAnimations hook
  const { actions } = useAnimations(animations, sceneRef);

  // 1. WebGL/Linux Stability: Convert geometries to non-indexed to prevent index buffer underflows in Mesa drivers
  React.useMemo(() => {
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.matrixAutoUpdate = true;
        
        if (mesh.geometry && mesh.geometry.index) {
          mesh.geometry = mesh.geometry.toNonIndexed();
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.roughness = Math.min(mat.roughness, 0.4); // Sleeker robotic shell
          mat.metalness = Math.max(mat.metalness, 0.85); // High metallic cyber finish
        }
      }
    });
  }, [scene]);

  // 2. Play the baked stand/walk/hydraulic loop
  React.useEffect(() => {
    if (!actions) return;
    const action = actions['Animation'];
    if (action) {
      action.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  // 3. Dynamic animation speed, bobbing kinetics, and continuous rotation in useFrame
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();

    if (actions && actions['Animation']) {
      let speed = 1.0;
      if (state === 'alert') speed = 2.0;
      else if (state === 'thinking') speed = 0.5;
      else if (state === 'speaking') speed = 1.35;
      actions['Animation'].timeScale = speed;
    }

    if (group.current) {
      // Floating bobbing y-axis movement
      group.current.position.y = -1.0 + Math.sin(time * 1.5) * 0.08;
      
      // Slowly rotate the model to show off the complex hydraulics from all angles
      group.current.rotation.y = time * 0.15;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();

    const targetColor = new THREE.Color('#9b5de5');
    let targetIntensity: number;

    if (state === 'alert') {
      targetColor.set('#ff003c');
      targetIntensity = 1.8 + Math.sin(time * 16) * 0.6; // Strong rapid pulse
    } else if (state === 'thinking') {
      targetColor.set('#00f0ff');
      targetIntensity = 1.0 + Math.sin(time * 2.5) * 0.3; // Breathing pulse
    } else if (state === 'speaking') {
      targetColor.set('#ffb703');
      targetIntensity = 1.4 + Math.sin(time * 9) * 0.4; // Chat pulse
    } else {
      targetIntensity = 0.9 + Math.sin(time * 0.9) * 0.15; // Calm idle pulse
    }

    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[2, 3, 2]} />;
};

interface RendererProps {
  assetPath?: string;
  vikiState?: 'idle' | 'thinking' | 'speaking' | 'alert';
}

export const VikiAvatarRenderer: React.FC<RendererProps> = ({ vikiState = 'idle' }) => {
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
          camera={{ position: [0, 0.5, 3.8], fov: 40 }} // Perfect mid-ground framing for the 2m tall bot
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          {/* Enhanced local lighting setup for premium offline/local rendering */}
          <ambientLight intensity={0.6} />
          
          {/* Key Light */}
          <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
          
          {/* Fill Light to soften shadows */}
          <directionalLight position={[-5, 3, -5]} intensity={0.5} />
          
          {/* Rim Light for high metallic contour definitions */}
          <directionalLight position={[0, 10, -8]} intensity={1.2} />
          
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <SphereBotModel state={vikiState} />
          </Suspense>

          <OrbitControls
            target={[0, 0, 0]} // Centered exactly at the origin
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

// Preload the Sphere Bot asset to prevent initialization delays on mount
useGLTF.preload('/assets/sphere_bot.glb');
