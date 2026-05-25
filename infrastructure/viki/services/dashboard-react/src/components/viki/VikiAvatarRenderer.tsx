import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Highly-detailed cinematic mathematical face contour and curved column mapping representing V.I.K.I. from I, Robot
const getVoxelDepth = (x: number, y: number, time: number, state: string, amplitude: number) => {
  // 1. Base vertical cylindrical curvature along the X-axis (creating the curved column face slab)
  let depth = Math.cos((x / 2.0) * (Math.PI / 2.2)) * 0.45;
  
  // squished radial radius for a perfect head shape
  const headX = x * 1.35;
  const headY = y - 0.05;
  const r = Math.sqrt(headX * headX + headY * headY);
  
  if (r <= 1.6) {
    // 2. Base head ellipsoid dome contour overlaid on top of the cylinder
    depth += Math.cos((r / 1.6) * (Math.PI / 2)) * 0.45;
    
    // 3. Sharp Nose ridge protrusion
    if (Math.abs(x) < 0.14 && y > -0.2 && y < 0.32) {
      const noseFactor = (1.0 - Math.abs(x) / 0.14) * (0.32 - y) * 1.3;
      depth += 0.38 * noseFactor;
    }
    
    // 4. Detailed Eyebrow ridges
    if (y > 0.28 && y < 0.42 && Math.abs(x) < 0.52) {
      const browFactor = Math.cos((x / 0.52) * (Math.PI / 2)) * Math.sin(((y - 0.28) / 0.14) * Math.PI) * 0.09;
      depth += browFactor;
    }

    // 5. Deep Eye socket depressions (creating shadows)
    const leftEye = Math.sqrt((x + 0.36)*(x + 0.36) + (y - 0.18)*(y - 0.18));
    const rightEye = Math.sqrt((x - 0.36)*(x - 0.36) + (y - 0.18)*(y - 0.18));
    if (leftEye < 0.22) {
      depth -= 0.3 * Math.cos((leftEye / 0.22) * (Math.PI / 2));
    }
    if (rightEye < 0.22) {
      depth -= 0.3 * Math.cos((rightEye / 0.22) * (Math.PI / 2));
    }
    
    // 6. Lips & mouth opening (reactive speech contractions)
    const lipY = Math.abs(y + 0.28);
    const lipX = Math.abs(x);
    if (lipY < 0.18 && lipX < 0.38) {
      const mouthArea = Math.cos((lipX / 0.38) * (Math.PI / 2)) * Math.cos((lipY / 0.18) * (Math.PI / 2));
      let mouthOpening = 0;
      if (state === 'speaking') {
        mouthOpening = amplitude * 0.28 * Math.abs(Math.sin(time * 15.0));
      }
      depth += (0.1 - mouthOpening) * mouthArea;
    }
    
    // 7. Prominent curved cheeks
    const leftCheek = Math.sqrt((x + 0.44)*(x + 0.44) + (y + 0.05)*(y + 0.05));
    const rightCheek = Math.sqrt((x - 0.44)*(x - 0.44) + (y + 0.05)*(y + 0.05));
    if (leftCheek < 0.3) {
      depth += 0.1 * Math.cos((leftCheek / 0.3) * (Math.PI / 2));
    }
    if (rightCheek < 0.3) {
      depth += 0.1 * Math.cos((rightCheek / 0.3) * (Math.PI / 2));
    }
    
    // 8. Chin protrusion
    const chin = Math.sqrt(x*x + (y + 0.62)*(y + 0.62));
    if (chin < 0.18) {
      depth += 0.18 * Math.cos((chin / 0.18) * (Math.PI / 2));
    }
  } else {
    // Subtle background column ripple
    depth += Math.sin(x * 1.5 + y * 1.5 + time * 0.8) * 0.02;
  }
  
  // Continuous shifting organic wave ripple running across the entire face (kinetic voxel wall style)
  let waveSpeed = 2.0;
  if (state === 'thinking') waveSpeed = 3.2;
  else if (state === 'alert') waveSpeed = 4.8;
  
  let wave = Math.sin(x * 1.8 - time * waveSpeed) * Math.cos(y * 1.8 + time * (waveSpeed * 0.7)) * 0.08;
  
  // Speak-reactive push/pull kinetics (bulges entire face forward and sends ripples)
  if (state === 'speaking') {
    wave += Math.sin(r * 2.5 - time * 12.0) * amplitude * 0.12;
    depth += amplitude * 0.16 * Math.cos((r / 1.6) * (Math.PI / 2));
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
  
  // Dynamic color interpolation cache
  const tempColor = React.useMemo(() => new THREE.Color(), []);
  
  // Dynamic glow color matching the movie screenshot (glowing silver-white / translucent slate-blue)
  let colorMapStart = '#0f2c3d'; // Deep translucent slate blue (recessed)
  let colorMapEnd = '#ffffff';   // Luminous glowing silver-white (extruded face features)
  
  if (state === 'alert') {
    colorMapStart = '#470a14';
    colorMapEnd = '#ff4d6a';
  } else if (state === 'speaking') {
    colorMapStart = '#12485e';
    colorMapEnd = '#e0ffff';
  }
  
  const colStartObj = React.useMemo(() => new THREE.Color(colorMapStart), [colorMapStart]);
  const colEndObj = React.useMemo(() => new THREE.Color(colorMapEnd), [colorMapEnd]);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (!meshRef.current) return;
    
    let amplitude = 0;
    if (state === 'speaking') {
      const syllableMod = 0.5 + Math.sin(time * 8.0) * 0.35 + Math.sin(time * 22.0) * 0.15;
      amplitude = Math.max(0.0, syllableMod);
    } else if (state === 'thinking') {
      amplitude = 0.08 + Math.sin(time * 18.0) * 0.04;
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
        if (state === 'speaking' && Math.abs(posY + 0.28) < 0.25 && Math.abs(posX) < 0.38) {
          scaleZ = 1.0 + amplitude * 0.2;
        }
        
        dummy.scale.set(1.0, 1.0, scaleZ);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(index, dummy.matrix);
        
        // Dynamic instance coloring based on Z-depth to create beautiful highlight contrast!
        // Maps posZ range [-0.2, 0.8] to [0.0, 1.0]
        const depthRatio = Math.max(0.0, Math.min(1.0, (posZ + 0.2) / 0.95));
        tempColor.lerpColors(colStartObj, colEndObj, depthRatio);
        
        // Highlight active speech areas reactively
        if (state === 'speaking' && Math.abs(posY + 0.28) < 0.2 && Math.abs(posX) < 0.3) {
          tempColor.addScalar(amplitude * 0.15);
        }
        
        meshRef.current.setColorAt(index, tempColor);
        index++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  return (
    <instancedMesh ref={meshRef} args={[boxGeom, null as any, count]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color="#ffffff" 
        emissive={state === 'alert' ? '#ff3050' : '#d0f5ff'}
        emissiveIntensity={state === 'alert' ? 1.6 : 1.15}
        roughness={0.05}
        metalness={0.95}
        transparent 
        opacity={0.68}
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
      outerCubeRef.current.rotation.y = time * 0.12;
      outerCubeRef.current.rotation.x = time * 0.06;
    }
    if (innerSphereRef.current) {
      innerSphereRef.current.rotation.y = -time * 0.15;
      innerSphereRef.current.rotation.z = time * 0.08;
    }
  });
  
  let color = '#d0f5ff'; // Holographic cinematic silver-blue
  if (state === 'alert') color = '#ff3050';
  else if (state === 'speaking') color = '#e0ffff';
  else if (state === 'idle') color = '#c0e0ff';
  
  return (
    <group position={[0, 0, 0]}>
      {/* Outer Holographic Cube */}
      <mesh ref={outerCubeRef}>
        <boxGeometry args={[4.2, 4.2, 4.2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.08} />
      </mesh>
      
      {/* Secondary Outer Outline for Depth */}
      <mesh ref={outerCubeRef} scale={1.01}>
        <boxGeometry args={[4.2, 4.2, 4.2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.03} />
      </mesh>

      {/* Nested Rotating Holographic Inner Sphere */}
      <mesh ref={innerSphereRef}>
        <sphereGeometry args={[2.6, 16, 16]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.03} />
      </mesh>
    </group>
  );
};

const CyberParticles = ({ count = 60, state }: { count?: number; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5.0;          // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.5 - 0.2; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4.0;       // z
    }
    return pos;
  }, [count]);

  useFrame((threeState) => {
    if (!pointsRef.current) return;
    const time = threeState.clock.getElapsedTime();
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let speed = 0.007;
    if (state === 'alert') speed = 0.022;
    else if (state === 'thinking') speed = 0.004;
    else if (state === 'speaking') speed = 0.010;

    for (let i = 0; i < count; i++) {
      // Float upwards
      array[i * 3 + 1] += speed;
      // Reset if floated out of screen
      if (array[i * 3 + 1] > 2.6) {
        array[i * 3 + 1] = -2.6;
        array[i * 3] = (Math.random() - 0.5) * 5.0;
      }
      // Horizontal wave sway
      array[i * 3] += Math.sin(time * 0.9 + i) * 0.003;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  let color = '#d0f5ff';
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#a0e0ff';

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
        size={0.05}
        transparent
        opacity={0.5}
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
      gridRef.current.rotation.y = time * 0.04;
      const mat = gridRef.current.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.18;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = -time * 0.06;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = time * 0.1;
    }
  });

  let color = '#c0e0ff';
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#e0ffff';

  return (
    <group position={[0, -2.8, 0]}>
      {/* Dynamic Cyber Grid */}
      <gridHelper ref={gridRef} args={[6.5, 14, color, color]} />
      
      {/* Outer cyber ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.8, 1.95, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.3} transparent wireframe />
      </mesh>
      
      {/* Inner cyber ring */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.8, 0.86, 24]} />
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
    
    let targetColor = new THREE.Color('#d0f5ff');
    let targetIntensity = 0.8;
    
    if (state === 'alert') {
      targetColor.set('#ff3050');
      targetIntensity = 1.3 + Math.sin(time * 18.0) * 0.4;
    } else if (state === 'thinking') {
      targetColor.set('#80d0ff');
      targetIntensity = 0.7 + Math.sin(time * 3.0) * 0.15;
    } else if (state === 'speaking') {
      targetColor.set('#ffffff');
      targetIntensity = 0.9 + Math.sin(time * 10.0) * 0.25;
    } else {
      targetIntensity = 0.6 + Math.sin(time * 1.2) * 0.08;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-2, 1, 2.5]} />;
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
          camera={{ position: [0, 0, 7.0], fov: 36 }} // Aligned precise framing
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 3]} intensity={1.5} castShadow />
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
            maxPolarAngle={Math.PI / 1.7} 
            minPolarAngle={Math.PI / 2.3} 
          />
        </Canvas>
      </div>
    </div>
  );
};
