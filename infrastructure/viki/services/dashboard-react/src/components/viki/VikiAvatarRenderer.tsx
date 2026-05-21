import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles loading and animating the 3D asset
const AvatarModel = ({ modelPath }: { modelPath: string; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const { actions } = useAnimations(animations, sceneRef);

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

  // Subtle ambient floating/bobbing on the root group
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (group.current) {
      // Gentle floating bobbing
      group.current.position.y = -3.35 + Math.sin(time * 0.4) * 0.015;
      // Soft floating yaw sway
      group.current.rotation.y = Math.sin(time * 0.2) * 0.02;
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

const CyberParticles = ({ count = 40, state }: { count?: number; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate random positions
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5;          // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6 - 0.5; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;       // z
    }
    return pos;
  }, [count]);

  useFrame((threeState) => {
    if (!pointsRef.current) return;
    const time = threeState.clock.getElapsedTime();
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let speed = 0.006;
    if (state === 'alert') speed = 0.022;
    else if (state === 'thinking') speed = 0.0035;
    else if (state === 'speaking') speed = 0.010;

    for (let i = 0; i < count; i++) {
      // Float upwards
      array[i * 3 + 1] += speed;
      // Reset if float out of screen
      if (array[i * 3 + 1] > 3.0) {
        array[i * 3 + 1] = -3.4;
        array[i * 3] = (Math.random() - 0.5) * 5;
      }
      // Subtle horizontal sway
      array[i * 3] += Math.sin(time * 0.8 + i) * 0.003;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  let color = '#9b5de5';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#ffb703';

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
        size={0.07}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
};

const HolographicPlatform = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const gridRef = useRef<THREE.GridHelper>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    
    // Rotate the platform slowly
    if (gridRef.current) {
      gridRef.current.rotation.y = time * 0.04;
      const mat = gridRef.current.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.22;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = -time * 0.06;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = time * 0.09;
    }
  });

  // Dynamic colors based on state
  let color = '#9b5de5';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#ffb703';

  return (
    <group position={[0, -3.4, 0]}>
      {/* Coordinate grid */}
      <gridHelper ref={gridRef} args={[7, 18, color, color]} />
      
      {/* Outer Cyber ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.7, 1.85, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.35} transparent wireframe />
      </mesh>
      
      {/* Inner Cyber ring */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.7, 0.76, 24]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.25} transparent wireframe />
      </mesh>
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    let targetColor = new THREE.Color('#9b5de5');
    let targetIntensity = 0.5;
    
    if (state === 'alert') {
      targetColor.set('#ff003c');
      targetIntensity = 0.9 + Math.sin(time * 16) * 0.35; // Rapid heartbeat pulse
    } else if (state === 'thinking') {
      targetColor.set('#00f0ff');
      targetIntensity = 0.45 + Math.sin(time * 2.5) * 0.15; // Slow breathing pulse
    } else if (state === 'speaking') {
      targetColor.set('#ffb703');
      targetIntensity = 0.6 + Math.sin(time * 9) * 0.25; // Energetic chat pulse
    } else {
      // Calm, slow idle breathing pulse
      targetIntensity = 0.4 + Math.sin(time * 0.9) * 0.08;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-2, -1, -1]} />;
};

interface RendererProps {
  assetPath: string; 
  vikiState?: 'idle' | 'thinking' | 'speaking' | 'alert';
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
          camera={{ position: [0, -0.5, 7.8], fov: 40 }} // Beautifully aligned framing with zero clipping
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow />
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial wireframe /></mesh>}>
            <AvatarModel modelPath={assetPath} state={vikiState} />
            <Environment preset="city" />
            <CyberParticles state={vikiState} />
            <HolographicPlatform state={vikiState} />
          </Suspense>

          <OrbitControls 
            target={[0, -1.35, 0]}
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

