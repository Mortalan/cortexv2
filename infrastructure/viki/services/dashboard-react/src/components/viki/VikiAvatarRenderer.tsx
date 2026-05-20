import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles loading and animating the 3D asset
const AvatarModel = ({ modelPath, state }: { modelPath: string, state: 'idle' | 'thinking' | 'speaking' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    if (!actions) return;

    // Map internal states to animation names (assuming these exist in the GLB)
    const animationMap: Record<string, string> = {
      idle: 'Idle',
      thinking: 'Thinking',
      speaking: 'Talking'
    };

    const targetAnim = animationMap[state] || Object.keys(actions)[0];
    const action = actions[targetAnim] || actions[Object.keys(actions)[0]];

    if (action) {
      // Stop all other actions
      Object.values(actions).forEach(a => a?.fadeOut(0.5));
      action.reset().fadeIn(0.5).play();
    }
  }, [actions, state]);

  useFrame((state) => {
    if (group.current) {
      // Subtle floating movement
      group.current.position.y = -3.2 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      // Very slight rotation sway
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
    }
  });
  
  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        position={[0, 0, 0]} 
        scale={1.3} 
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
          camera={{ position: [0, 0, 5.5], fov: 40 }} // Pulled back slightly more
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
