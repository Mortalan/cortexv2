import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Mathematical face contour depth mapping representing V.I.K.I. from I, Robot
const getVoxelDepth = (x: number, y: number, time: number, state: string, amplitude: number) => {
  const r = Math.sqrt(x*x + y*y);
  
  // Outside face boundary, show background breathing ripple matrix
  if (r > 1.6) {
    return Math.sin(x * 2.0 + y * 2.0 + time * 1.5) * 0.04;
  }
  
  // Base head ellipsoid dome contour
  let depth = Math.cos((r / 1.6) * (Math.PI / 2)) * 0.55;
  
  // 1. Nose ridge protrusion
  if (Math.abs(x) < 0.16 && y > -0.25 && y < 0.3) {
    const noseFactor = (1.0 - Math.abs(x) / 0.16) * (0.3 - y) * 0.8;
    depth += 0.35 * noseFactor;
  }
  
  // 2. Eye sockets depressions
  const leftEyeDist = Math.sqrt((x + 0.38)*(x + 0.38) + (y - 0.22)*(y - 0.22));
  const rightEyeDist = Math.sqrt((x - 0.38)*(x - 0.38) + (y - 0.22)*(y - 0.22));
  if (leftEyeDist < 0.24) {
    depth -= 0.18 * Math.cos((leftEyeDist / 0.24) * (Math.PI / 2));
  }
  if (rightEyeDist < 0.24) {
    depth -= 0.18 * Math.cos((rightEyeDist / 0.24) * (Math.PI / 2));
  }
  
  // 3. Mouth horizontal ridge & lips (reactive speech contractions)
  const lipDistY = Math.abs(y + 0.32);
  const lipDistX = Math.abs(x);
  if (lipDistY < 0.22 && lipDistX < 0.45) {
    const mouthArea = Math.cos((lipDistX / 0.45) * (Math.PI / 2)) * Math.cos((lipDistY / 0.22) * (Math.PI / 2));
    let mouthOpening = 0;
    if (state === 'speaking') {
      mouthOpening = amplitude * 0.22 * Math.sin(time * 15.0);
    }
    depth += (0.15 - mouthOpening) * mouthArea;
  }
  
  // 4. Chin protrusion
  const chinDist = Math.sqrt(x*x + (y + 0.72)*(y + 0.72));
  if (chinDist < 0.2) {
    depth += 0.12 * Math.cos((chinDist / 0.2) * (Math.PI / 2));
  }
  
  // 5. Threat alert matrix tremor
  if (state === 'alert') {
    depth += Math.sin(time * 30.0 + x * 10.0) * 0.05;
  }
  
  return depth;
};

// Shifting kinetic voxel face matrix (InstancedMesh optimal single draw call)
const VIKIVoxelFace = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const gridWidth = 24;
  const gridHeight = 24;
  const count = gridWidth * gridHeight;
  const spacing = 0.15;
  
  // Kinetic long rods geometries
  const boxGeom = React.useMemo(() => new THREE.BoxGeometry(0.11, 0.11, 0.65), []);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    let amplitude = 0;
    if (state === 'speaking') {
      const syllableMod = 0.5 + Math.sin(time * 7.5) * 0.35 + Math.sin(time * 20.0) * 0.15;
      amplitude = Math.max(0.0, syllableMod);
    } else if (state === 'thinking') {
      amplitude = 0.08 + Math.sin(time * 16.0) * 0.03;
    }
    
    let index = 0;
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const posX = (x - gridWidth / 2) * spacing;
        const posY = (y - gridHeight / 2) * spacing;
        
        const posZ = getVoxelDepth(posX, posY, time, state, amplitude);
        dummy.position.set(posX, posY, posZ);
        
        let scaleZ = 1.0;
        if (state === 'speaking' && Math.abs(posY + 0.32) < 0.2 && Math.abs(posX) < 0.4) {
          scaleZ = 1.0 + amplitude * 0.15;
        }
        
        dummy.scale.set(1.0, 1.0, scaleZ);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(index++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  let color = '#00a8ff'; // Cyber blue (thinking)
  if (state === 'alert') color = '#ff003c'; // Threat Red
  else if (state === 'speaking') color = '#00ffcc'; // Voice green/cyan
  else if (state === 'idle') color = '#7b2cff'; // Idle purple
  
  return (
    <instancedMesh ref={meshRef} args={[boxGeom, null as any, count]} position={[0, -0.25, 0]}>
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={state === 'alert' ? 0.6 : 0.25}
        roughness={0.15}
        metalness={0.85}
        transparent 
        opacity={0.8}
      />
    </instancedMesh>
  );
};

// Rotating outer holographic cube boundary
const HolographicVIKICube = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const outerCubeRef = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (outerCubeRef.current) {
      outerCubeRef.current.rotation.y = time * 0.12;
      outerCubeRef.current.rotation.x = time * 0.06;
    }
  });
  
  let color = '#00a8ff';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'speaking') color = '#00ffcc';
  else if (state === 'idle') color = '#7b2cff';
  
  return (
    <mesh ref={outerCubeRef} position={[0, -0.25, 0]}>
      <boxGeometry args={[4.2, 4.2, 4.2]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.06} />
    </mesh>
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
            <HolographicVIKICube state={vikiState} />
            <VIKIVoxelFace state={vikiState} />
            <Environment preset="city" />
            <CyberParticles state={vikiState} />
            <HolographicPlatform state={vikiState} />
          </Suspense>

          <OrbitControls 
            target={[0, -0.25, 0]}
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

