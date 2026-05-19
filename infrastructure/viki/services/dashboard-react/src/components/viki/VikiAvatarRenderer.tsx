import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';

// Component that handles loading and animating the 3D asset
const AvatarModel = ({ modelPath }: { modelPath: string }) => {
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    // Play the first animation (usually Idle or Walk)
    if (actions && Object.keys(actions).length > 0) {
      const firstAction = actions[Object.keys(actions)[0]];
      if (firstAction) {
        firstAction.reset().fadeIn(0.5).play();
      }
    }
  }, [actions]);
  
  return (
    <primitive 
      object={scene} 
      position={[0, -3.2, 0]} // Lowered further to bring the head into view
      scale={1.3} // Slightly reduced to fit better
    />
  );
};

interface RendererProps {
  assetPath: string; 
}

export const VikiAvatarRenderer: React.FC<RendererProps> = ({ assetPath }) => {
  return (
    <div 
      className="viki-canvas-wrapper" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        minHeight: '600px', 
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
            <AvatarModel modelPath={assetPath} />
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
