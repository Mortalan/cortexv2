import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Highly-detailed cinematic mathematical face contour and curved column mapping representing V.I.K.I. from I, Robot
const getVoxelDepth = (x: number, y: number, time: number, state: string, amplitude: number) => {
  // Base cylindrical surface representing the glowing digital column screen
  let depth = Math.cos((x / 2.2) * (Math.PI / 2)) * 0.5;
  
  // Radial coordinates centered on the head ellipsoid
  const headX = x * 1.3;
  const headY = y - 0.08;
  const r = Math.sqrt(headX * headX + headY * headY);
  
  if (r <= 1.55) {
    // Ellipsoid face dome projection
    const domeRatio = r / 1.55;
    depth += Math.cos(domeRatio * (Math.PI / 2)) * 0.55;
    
    // 1. Nose ridge protrusion (realistic sharp bone profile)
    if (Math.abs(x) < 0.12 && y > -0.22 && y < 0.32) {
      const noseFactor = (1.0 - Math.abs(x) / 0.12) * ((0.32 - y) / 0.54);
      depth += 0.36 * noseFactor;
    }
    
    // 2. Eyebrow ridge arches
    if (y > 0.28 && y < 0.44 && Math.abs(x) < 0.48) {
      const browY = (y - 0.28) / 0.16; // 0 to 1
      const browX = Math.abs(x) / 0.48; // 0 to 1
      const browFactor = Math.sin(browY * Math.PI) * Math.cos(browX * (Math.PI / 2));
      depth += 0.09 * browFactor;
    }

    // 3. Eye socket depressions (eyeballs sockets)
    const leftEye = Math.sqrt((x + 0.35) * (x + 0.35) + (y - 0.18) * (y - 0.18));
    const rightEye = Math.sqrt((x - 0.35) * (x - 0.35) + (y - 0.18) * (y - 0.18));
    if (leftEye < 0.2) {
      depth -= 0.22 * Math.cos((leftEye / 0.2) * (Math.PI / 2));
    }
    if (rightEye < 0.2) {
      depth -= 0.22 * Math.cos((rightEye / 0.2) * (Math.PI / 2));
    }
    
    // 4. Prominent organic cheekbones
    const leftCheek = Math.sqrt((x + 0.42) * (x + 0.42) + (y + 0.05) * (y + 0.05));
    const rightCheek = Math.sqrt((x - 0.42) * (x - 0.42) + (y + 0.05) * (y + 0.05));
    if (leftCheek < 0.28) {
      depth += 0.095 * Math.cos((leftCheek / 0.28) * (Math.PI / 2));
    }
    if (rightCheek < 0.28) {
      depth += 0.095 * Math.cos((rightCheek / 0.28) * (Math.PI / 2));
    }
    
    // 5. Mouth horizontal lip contour (opens and deforms with speech!)
    const lipY = Math.abs(y + 0.26);
    const lipX = Math.abs(x);
    if (lipY < 0.16 && lipX < 0.36) {
      const mouthArea = Math.cos((lipX / 0.36) * (Math.PI / 2)) * Math.cos((lipY / 0.16) * (Math.PI / 2));
      let mouthOpening = 0;
      if (state === 'speaking') {
        // syllabic oscillations creating realistic mouth opening
        mouthOpening = amplitude * 0.22 * Math.abs(Math.sin(time * 16.0));
      }
      depth += (0.08 - mouthOpening) * mouthArea;
    }
    
    // 6. Chin contour
    const chin = Math.sqrt(x * x + (y + 0.58) * (y + 0.58));
    if (chin < 0.16) {
      depth += 0.16 * Math.cos((chin / 0.16) * (Math.PI / 2));
    }
  } else {
    // Subtle cybernetic background matrix wave ripples
    depth += Math.sin(x * 2.0 + y * 1.5 + time * 0.7) * 0.015;
  }
  
  // Continuous shifting organic wave ripple running across the entire face (kinetic voxel wall style)
  let waveSpeed = 2.0;
  if (state === 'thinking') waveSpeed = 3.6;
  else if (state === 'alert') waveSpeed = 5.0;
  
  let wave = Math.sin(x * 1.6 - time * waveSpeed) * Math.cos(y * 1.6 + time * (waveSpeed * 0.75)) * 0.07;
  
  // Speak-reactive push/pull kinetics (bulges entire face forward and sends ripples)
  if (state === 'speaking') {
    const speechRadius = Math.sqrt(x*x + y*y);
    wave += Math.sin(speechRadius * 2.4 - time * 13.0) * amplitude * 0.12;
    depth += amplitude * 0.14 * Math.cos(Math.min(1.0, speechRadius / 1.5) * (Math.PI / 2));
  }
  
  // Micro-shivering in alert state
  if (state === 'alert') {
    depth += Math.sin(time * 45.0 + x * 15.0) * 0.025;
  }
  
  depth += wave;
  return depth;
};

// Shifting kinetic voxel face matrix (InstancedMesh optimal single draw call)
const VIKIVoxelFace = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const meshRefRods = useRef<THREE.InstancedMesh>(null);
  const meshRefSpheres = useRef<THREE.InstancedMesh>(null);

  // High-resolution grid to create a solid coherent surface rather than sparse lines
  const gridWidth = 46;
  const gridHeight = 46;
  const count = gridWidth * gridHeight;
  const spacing = 0.088; // Wider spacing for true translucent holographic lattice

  // Geometry: Thin vertical lines of light + tip joint spheres
  const boxGeom = React.useMemo(() => new THREE.BoxGeometry(0.016, 0.016, 0.9), []);
  const sphereGeom = React.useMemo(() => new THREE.SphereGeometry(0.02, 6, 6), []);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);

  // Dynamic color interpolation cache
  const tempColor = React.useMemo(() => new THREE.Color(), []);

  // Glowing holographic colors matching the movie screenshots
  let colorMapStart = '#051c2b'; // Deep translucent base blue (recessed)
  let colorMapEnd = '#a0d8ff';   // Luminous glowing ice-blue (prominent face features)

  if (state === 'alert') {
    colorMapStart = '#2b0207'; // Deep red
    colorMapEnd = '#ff3b5c';   // Threat red
  } else if (state === 'speaking') {
    colorMapStart = '#04262b'; // Deep teal
    colorMapEnd = '#d8ffff';   // Glowing silver-cyan
  } else if (state === 'thinking') {
    colorMapStart = '#021630'; // Deep cobalt
    colorMapEnd = '#00bfff';   // Electric cyan-blue
  }

  const colStartObj = React.useMemo(() => new THREE.Color(colorMapStart), [colorMapStart]);
  const colEndObj = React.useMemo(() => new THREE.Color(colorMapEnd), [colorMapEnd]);

  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (!meshRefRods.current || !meshRefSpheres.current) return;

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
        
        // 1. Draw vertical light rods
        dummy.position.set(posX, posY, posZ);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        meshRefRods.current.setMatrixAt(index, dummy.matrix);

        // 2. Draw front joint pixel spheres (offset by 0.45, half the rod's length)
        dummy.position.set(posX, posY, posZ + 0.45);
        dummy.updateMatrix();
        meshRefSpheres.current.setMatrixAt(index, dummy.matrix);

        // 3. Dynamic color interpolation based on depth
        const depthRatio = Math.max(0.0, Math.min(1.0, (posZ + 0.2) / 1.1));
        tempColor.lerpColors(colStartObj, colEndObj, depthRatio);

        // Reactively brighten active speech region
        if (state === 'speaking' && Math.abs(posY + 0.26) < 0.15 && Math.abs(posX) < 0.36) {
          tempColor.addScalar(amplitude * 0.12);
        }

        meshRefRods.current.setColorAt(index, tempColor);
        meshRefSpheres.current.setColorAt(index, tempColor);

        index++;
      }
    }

    meshRefRods.current.instanceMatrix.needsUpdate = true;
    meshRefSpheres.current.instanceMatrix.needsUpdate = true;
    
    if (meshRefRods.current.instanceColor) {
      meshRefRods.current.instanceColor.needsUpdate = true;
    }
    if (meshRefSpheres.current.instanceColor) {
      meshRefSpheres.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Grid Lines Mesh */}
      <instancedMesh ref={meshRefRods} args={[boxGeom, null as any, count]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Grid Joint Pixels Mesh */}
      <instancedMesh ref={meshRefSpheres} args={[sphereGeom, null as any, count]}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};

// Double-layer counter-rotating outer wireframe box enclosure centered around the face
const HolographicVIKICube = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const outerCubeRef1 = useRef<THREE.Mesh>(null);
  const outerCubeRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (outerCubeRef1.current) {
      outerCubeRef1.current.rotation.y = time * 0.14;
      outerCubeRef1.current.rotation.x = time * 0.06;
    }
    if (outerCubeRef2.current) {
      outerCubeRef2.current.rotation.y = -time * 0.08;
      outerCubeRef2.current.rotation.z = time * 0.11;
    }
  });
  
  let color = '#a0d8ff'; 
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#d0f5ff';
  
  return (
    <group position={[0, 0, 0]}>
      {/* Primary Cube Cage */}
      <mesh ref={outerCubeRef1}>
        <boxGeometry args={[4.4, 4.4, 4.4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.06} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Secondary Inner Cage for Parallax Depth */}
      <mesh ref={outerCubeRef2} scale={0.96}>
        <boxGeometry args={[4.4, 4.4, 4.4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.03} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

// Cyber particles matrix floating around the face
const CyberParticles = ({ count = 55, state }: { count?: number; state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5.2;          // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.8 - 0.2; // y centered around head
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;       // z
    }
    return pos;
  }, [count]);

  useFrame((threeState) => {
    if (!pointsRef.current) return;
    const time = threeState.clock.getElapsedTime();
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;

    let speed = 0.008;
    if (state === 'alert') speed = 0.025;
    else if (state === 'thinking') speed = 0.005;
    else if (state === 'speaking') speed = 0.014;

    for (let i = 0; i < count; i++) {
      // Float upwards
      array[i * 3 + 1] += speed;
      // Reset if floated out of screen boundaries
      if (array[i * 3 + 1] > 2.6) {
        array[i * 3 + 1] = -2.6;
        array[i * 3] = (Math.random() - 0.5) * 5.2;
      }
      // Horizontal sinusoidal sway
      array[i * 3] += Math.sin(time * 0.95 + i) * 0.0035;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  let color = '#a0d8ff';
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#d0f5ff';

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
        size={0.045}
        transparent
        opacity={0.45}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Translucent glowing grid platform below the entity
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
      mat.opacity = 0.15;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.z = -time * 0.05;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = time * 0.08;
    }
  });

  let color = '#80c0ff';
  if (state === 'alert') color = '#ff3050';
  else if (state === 'thinking') color = '#00f0ff';
  else if (state === 'speaking') color = '#a0d8ff';

  return (
    <group position={[0, -2.4, 0]}>
      {/* Dynamic Cyber Grid */}
      <gridHelper ref={gridRef} args={[7.0, 16, color, color]} />
      
      {/* Outer cyber ring */}
      <mesh ref={ringRef1} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[2.0, 2.15, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.22} transparent wireframe />
      </mesh>
      
      {/* Inner cyber ring */}
      <mesh ref={ringRef2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.9, 0.96, 24]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} opacity={0.18} transparent wireframe />
      </mesh>
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    const targetColor = new THREE.Color('#80c0ff');
    let targetIntensity = 0.7;
    
    if (state === 'alert') {
      targetColor.set('#ff3050');
      targetIntensity = 1.4 + Math.sin(time * 18.0) * 0.45;
    } else if (state === 'thinking') {
      targetColor.set('#00e5ff');
      targetIntensity = 0.8 + Math.sin(time * 3.5) * 0.15;
    } else if (state === 'speaking') {
      targetColor.set('#d0f5ff');
      targetIntensity = 1.0 + Math.sin(time * 11.0) * 0.28;
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
          camera={{ position: [0, 0, 6.2], fov: 38 }} // Perfect centered framing
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 3]} intensity={1.3} castShadow />
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <HolographicVIKICube state={vikiState} />
            <VIKIVoxelFace state={vikiState} />
            <Environment preset="city" />
            <CyberParticles state={vikiState} />
            <HolographicPlatform state={vikiState} />
          </Suspense>

          <OrbitControls 
            target={[0, 0, 0]} // Perfectly centered in the middle of the voxel projection
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

// Preload to remain API-compliant
useGLTF.preload('/assets/viki_android_real.glb');
