# CORTEX FRONTEND SPEC: READY-MADE 3D AVATAR ENGINE
## [VERSION 1.1 - MAY 2026]

---

### **GEMINI CLI EXECUTION PROMPT (COPY-PASTE TO RENDER THE ASSET)**
> "Read this ready_made_avatar.md file alongside CORTEX_MASTER_DOC.md. You are the frontend engineer for CORTEX. Implement the `VikiAvatarRenderer.tsx` component inside the React 19 dashboard using `@react-three/fiber` and `@react-three/drei` to load a pre-made local `.glb` asset with a clean, hardware-efficient rendering pipeline. Run git commits post-implementation."

---

## 1. OBJECTIVE
To mount a downloaded, pre-rigged, realistic hybrid android `.glb` asset into the CORTEX dashboard infrastructure without creating or purchasing assets from scratch. The rendering stack must load the asset locally and run completely client-side to minimize overhead on the CORE-100 service node.

---

## 2. FRONTEND IMPLEMENTATION (REACT 19 + THREE.JS)
We utilize `@react-three/fiber` (a React wrapper for Three.js) to effortlessly pull in the downloaded asset, handle basic lighting, and mount it into the dashboard layout.

**Component Path:** `/opt/cortex/infrastructure/viki/services/dashboard-react/src/components/viki/VikiAvatarRenderer.tsx`

```tsx
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
