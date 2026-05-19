import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';

// Component that handles loading the downloaded 3D asset
const AvatarModel = ({ modelPath }: { modelPath: string }) => {
  // useGLTF automatically caches and loads the asset from your public folder
  const { scene } = useGLTF(modelPath);
  
  return (
    <primitive 
      object={scene} 
      position={[0, -1, 0]} 
      scale={1} 
    />
  );
};

interface RendererProps {
  // Path to your downloaded asset, e.g., "/assets/viki_android_real.glb"
  assetPath: string; 
}

export const VikiAvatarRenderer: React.FC<RendererProps> = ({ assetPath }) => {
  return (
    <div className="viki-canvas-wrapper glassmorphic" style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        {/* Crisp, high-tech studio lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 4, 2]} intensity={0.8} castShadow />
        <pointLight position={[-2, -2, -2]} intensity={0.3} color="#9b5de5" /> {/* Subtle purple accent glow */}

        <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial wireframe /></mesh>}>
          <AvatarModel modelPath={assetPath} />
          {/* Automatically pulls in pre-baked ambient lighting textures */}
          <Environment preset="city" />
        </Suspense>

        {/* Allows you to spin/pan the camera during prototyping; can be disabled later */}
        <OrbitControls 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2} 
          minPolarAngle={Math.PI / 3} 
        />
      </Canvas>
    </div>
  );
};

// Ensure the GLTF loader unloads the asset correctly when unmounting
useGLTF.preload('/assets/viki_android_real.glb');
