import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Highly-detailed mathematical face contour and kinetic wave depth mapping representing V.I.K.I. from I, Robot
const getVoxelDepth = (x: number, y: number, time: number, state: string, amplitude: number) => {
  const r = Math.sqrt(x*x + y*y);
  
  // Base head ellipsoid dome contour (radius = 1.65)
  let depth = 0;
  
  if (r <= 1.65) {
    // Smooth dome base
    depth = Math.cos((r / 1.65) * (Math.PI / 2)) * 0.65;
    
    // 1. Nose ridge protrusion
    if (Math.abs(x) < 0.16 && y > -0.2 && y < 0.35) {
      const noseFactor = (1.0 - Math.abs(x) / 0.16) * (0.35 - y) * 1.1;
      depth += 0.38 * noseFactor;
    }
    
    // 2. Eyebrow ridge
    if (y > 0.28 && y < 0.45 && Math.abs(x) < 0.55) {
      const browFactor = Math.cos((x / 0.55) * (Math.PI / 2)) * Math.sin(((y - 0.28) / 0.17) * Math.PI) * 0.12;
      depth += browFactor;
    }

    // 3. Eye sockets (depressions)
    const leftEye = Math.sqrt((x + 0.36)*(x + 0.36) + (y - 0.18)*(y - 0.18));
    const rightEye = Math.sqrt((x - 0.36)*(x - 0.36) + (y - 0.18)*(y - 0.18));
    if (leftEye < 0.22) {
      depth -= 0.26 * Math.cos((leftEye / 0.22) * (Math.PI / 2));
    }
    if (rightEye < 0.22) {
      depth -= 0.26 * Math.cos((rightEye / 0.22) * (Math.PI / 2));
    }
    
    // 4. Lips & mouth opening (reactive speech contractions)
    const lipY = Math.abs(y + 0.28);
    const lipX = Math.abs(x);
    if (lipY < 0.18 && lipX < 0.38) {
      const mouthArea = Math.cos((lipX / 0.38) * (Math.PI / 2)) * Math.cos((lipY / 0.18) * (Math.PI / 2));
      let mouthOpening = 0;
      if (state === 'speaking') {
        mouthOpening = amplitude * 0.26 * Math.abs(Math.sin(time * 14.0));
      }
      depth += (0.12 - mouthOpening) * mouthArea;
    }
    
    // 5. Cheeks
    const leftCheek = Math.sqrt((x + 0.48)*(x + 0.48) + (y + 0.05)*(y + 0.05));
    const rightCheek = Math.sqrt((x - 0.48)*(x - 0.48) + (y + 0.05)*(y + 0.05));
    if (leftCheek < 0.28) {
      depth += 0.09 * Math.cos((leftCheek / 0.28) * (Math.PI / 2));
    }
    if (rightCheek < 0.28) {
      depth += 0.09 * Math.cos((rightCheek / 0.28) * (Math.PI / 2));
    }
    
    // 6. Chin
    const chin = Math.sqrt(x*x + (y + 0.62)*(y + 0.62));
    if (chin < 0.18) {
      depth += 0.16 * Math.cos((chin / 0.18) * (Math.PI / 2));
    }
  } else {
    // Outside boundary matrix ripple
    depth = Math.sin(x * 1.5 + y * 1.5 + time * 1.0) * 0.03;
  }
  
  // Continuous shifting organic wave ripple running across the entire face (kinetic voxel wall style)
  let waveSpeed = 2.2;
  if (state === 'thinking') waveSpeed = 3.6;
  else if (state === 'alert') waveSpeed = 5.2;
  
  let wave = Math.sin(x * 1.6 - time * waveSpeed) * Math.cos(y * 1.6 + time * (waveSpeed * 0.8)) * 0.09;
  
  // Speak-reactive push/pull kinetics (bulges entire face forward and sends ripples)
  if (state === 'speaking') {
    wave += Math.sin(r * 2.8 - time * 12.0) * amplitude * 0.14;
    depth += amplitude * 0.18 * Math.cos((r / 1.65) * (Math.PI / 2));
  }
  
  depth += wave;
  
  return depth;
};

// Shifting kinetic voxel face matrix (InstancedMesh optimal single draw call)
const VIKIVoxelFace = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // High-resolution grid to create a solid coherent surface rather than sparse lines
  const gridWidth = 44;
  const gridHeight = 44;
  const count = gridWidth * gridHeight;
  const spacing = 0.08;
  
  // Kinetic long rods geometries - packed closely together (0.074 width vs 0.080 spacing)
  const boxGeom = React.useMemo(() => new THREE.BoxGeometry(0.074, 0.074, 1.2), []);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    let amplitude = 0;
    if (state === 'speaking') {
      const syllableMod = 0.5 + Math.sin(time * 8.0) * 0.35 + Math.sin(time * 22.0) * 0.15;
      amplitude = Math.max(0.0, syllableMod);
    } else if (state === 'thinking') {
      amplitude = 0.09 + Math.sin(time * 18.0) * 0.04;
    }
    
    let index = 0;
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const posX = (x - gridWidth / 2) * spacing;
        const posY = (y - gridHeight / 2) * spacing;
        
        const posZ = getVoxelDepth(posX, posY, time, state, amplitude);
        dummy.position.set(posX, posY, posZ);
        
        let scaleZ = 1.0;
        // Dynamic extrusion based on speech activity
        if (state === 'speaking' && Math.abs(posY + 0.28) < 0.25 && Math.abs(posX) < 0.4) {
          scaleZ = 1.0 + amplitude * 0.25;
        }
        
        dummy.scale.set(1.0, 1.0, scaleZ);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(index++, dummy.matrix);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  // Curated harmonious neon color palettes
  let color = '#00a8ff'; // Cyber blue (thinking)
  if (state === 'alert') color = '#ff003c'; // Threat Red
  else if (state === 'speaking') color = '#00ffcc'; // Voice green/cyan
  else if (state === 'idle') color = '#7b2cff'; // Idle purple
  
  return (
    <instancedMesh ref={meshRef} args={[boxGeom, null as any, count]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color={color} 
        emissive={color}
        emissiveIntensity={state === 'alert' ? 0.7 : 0.35}
        roughness={0.1}
        metalness={0.9}
        transparent 
        opacity={0.82}
      />
    </instancedMesh>
  );
};

// Rotating outer holographic cube and inner sphere boundary
const HolographicVIKICube = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const outerCubeRef = useRef<THREE.Mesh>(null);
  const innerSphereRef = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (outerCubeRef.current) {
      outerCubeRef.current.rotation.y = time * 0.15;
      outerCubeRef.current.rotation.x = time * 0.08;
    }
    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y = -time * 0.2;
      innerSphereRef.current.rotation.z = time * 0.12;
    }
  });
  
  let color = '#00a8ff';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'speaking') color = '#00ffcc';
  else if (state === 'idle') color = '#7b2cff';
  
  return (
    <group position={[0, 0, 0]}>
      {/* Outer Holographic Cube */}
      <mesh ref={outerCubeRef}>
        <boxGeometry args={[4.0, 4.0, 4.0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.1} />
      </mesh>
      
      {/* Secondary Outer Outline for Depth */}
      <mesh ref={outerCubeRef} scale={1.01}>
        <boxGeometry args={[4.0, 4.0, 4.0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.03} />
      </mesh>

      {/* Nested Rotating Holographic Inner Sphere */}
      <mesh ref={innerSphereRef}>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.04} />
      </mesh>
    </group>
  );
};

const CyberParticles = ({ count = 50, state }: { count?: number; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4.8;          // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.5 - 0.2; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3.8;       // z
    }
    return pos;
  }, [count]);

  useFrame((threeState) => {
    if (!pointsRef.current) return;
    const time = threeState.clock.getElapsedTime();
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let speed = 0.007;
    if (state === 'alert') speed = 0.024;
    else if (state === 'thinking') speed = 0.004;
    else if (state === 'speaking') speed = 0.012;

    for (let i = 0; i < count; i++) {
      // Float upwards
      array[i * 3 + 1] += speed;
      // Reset if floated out of screen
      if (array[i * 3 + 1] > 2.6) {
        array[i * 3 + 1] = -2.6;
        array[i * 3] = (Math.random() - 0.5) * 4.8;
      }
      // Horizontal wave sway
      array[i * 3] += Math.sin(time * 0.9 + i) * 0.0035;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  let color = '#7b2cff';
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
        size={0.06}
        transparent
        opacity={0.6}
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
    
    if (gridRef.current) {
      gridRef.current.rotation.y = time * 0.05;
      const mat = gridRef.current.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.25;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = -time * 0.08;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = time * 0.12;
    }
  });

  let color = '#7b2cff';
  if (state === 'alert') color = '#ff003c';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#ffb703';

  return (
    <group position={[0, -2.8, 0]}>
      {/* Dynamic Cyber Grid */}
      <gridHelper ref={gridRef} args={[6.5, 16, color, color]} />
      
      {/* Outer cyber ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.8, 1.95, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.4} transparent wireframe />
      </mesh>
      
      {/* Inner cyber ring */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.8, 0.86, 24]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.3} transparent wireframe />
      </mesh>
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    let targetColor = new THREE.Color('#7b2cff');
    let targetIntensity = 0.6;
    
    if (state === 'alert') {
      targetColor.set('#ff003c');
      targetIntensity = 1.0 + Math.sin(time * 18.0) * 0.4; // Rapid emergency pulsing
    } else if (state === 'thinking') {
      targetColor.set('#00f0ff');
      targetIntensity = 0.5 + Math.sin(time * 3.0) * 0.15; // Meditative breathing pulsing
    } else if (state === 'speaking') {
      targetColor.set('#ffb703');
      targetIntensity = 0.7 + Math.sin(time * 10.0) * 0.25; // Dynamic voice pulsing
    } else {
      // Gentle idle breathing
      targetIntensity = 0.45 + Math.sin(time * 1.2) * 0.08;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-2, 1, 2]} />;
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
          camera={{ position: [0, 0, 7.2], fov: 38 }} // Aligned precise framing
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 5, 3]} intensity={1.4} castShadow />
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <HolographicVIKICube state={vikiState} />
            <VIKIVoxelFace state={vikiState} />
            <Environment preset="city" />
            <CyberParticles state={vikiState} />
            <HolographicPlatform state={vikiState} />
          </Suspense>

          <OrbitControls 
            target={[0, 0, 0]}
            enableZoom={false}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.6} 
            minPolarAngle={Math.PI / 2.4} 
          />
        </Canvas>
      </div>
    </div>
  );
};
