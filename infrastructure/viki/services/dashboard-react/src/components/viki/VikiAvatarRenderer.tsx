import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Highly-detailed deep 3D mathematical face contour and curved column mapping representing V.I.K.I. from I, Robot
const getVoxelDepth = (x: number, y: number, time: number, state: string, amplitude: number) => {
  // Base vertical cylindrical screen columns deforming back
  let depth = Math.cos((x / 2.2) * (Math.PI / 2)) * 0.7;
  
  // Radial coordinates for the face ellipsoid
  const headX = x * 1.25;
  const headY = y - 0.1;
  const r = Math.sqrt(headX * headX + headY * headY);
  
  if (r <= 1.6) {
    const domeRatio = r / 1.6;
    // Deep 3D ellipsoid dome depth (1.35 units instead of 0.55) to ensure face is highly visible in 3D
    depth += Math.cos(domeRatio * (Math.PI / 2)) * 1.35;
    
    // 1. Prominent sharp Nose ridge (0.85 units depth!)
    if (Math.abs(x) < 0.14 && y > -0.25 && y < 0.35) {
      const noseFactor = (1.0 - Math.abs(x) / 0.14) * ((0.35 - y) / 0.6);
      depth += 0.85 * noseFactor;
    }
    
    // 2. High eyebrow arches
    if (y > 0.28 && y < 0.46 && Math.abs(x) < 0.5) {
      const browY = (y - 0.28) / 0.18;
      const browX = Math.abs(x) / 0.5;
      const browFactor = Math.sin(browY * Math.PI) * Math.cos(browX * (Math.PI / 2));
      depth += 0.18 * browFactor;
    }

    // 3. Deep eye socket depressions (creating sharp 3D shadows)
    const leftEye = Math.sqrt((x + 0.38) * (x + 0.38) + (y - 0.2) * (y - 0.2));
    const rightEye = Math.sqrt((x - 0.38) * (x - 0.38) + (y - 0.2) * (y - 0.2));
    if (leftEye < 0.22) {
      depth -= 0.52 * Math.cos((leftEye / 0.22) * (Math.PI / 2));
    }
    if (rightEye < 0.22) {
      depth -= 0.52 * Math.cos((rightEye / 0.22) * (Math.PI / 2));
    }
    
    // 4. Strong organic cheekbones
    const leftCheek = Math.sqrt((x + 0.44) * (x + 0.44) + (y + 0.05) * (y + 0.05));
    const rightCheek = Math.sqrt((x - 0.44) * (x - 0.44) + (y + 0.05) * (y + 0.05));
    if (leftCheek < 0.3) {
      depth += 0.24 * Math.cos((leftCheek / 0.3) * (Math.PI / 2));
    }
    if (rightCheek < 0.3) {
      depth += 0.24 * Math.cos((rightCheek / 0.3) * (Math.PI / 2));
    }
    
    // 5. Lip contour (reactive mouth opening)
    const lipY = Math.abs(y + 0.28);
    const lipX = Math.abs(x);
    if (lipY < 0.18 && lipX < 0.38) {
      const mouthArea = Math.cos((lipX / 0.38) * (Math.PI / 2)) * Math.cos((lipY / 0.18) * (Math.PI / 2));
      let mouthOpening = 0;
      if (state === 'speaking') {
        mouthOpening = amplitude * 0.45 * Math.abs(Math.sin(time * 15.0));
      }
      depth += (0.18 - mouthOpening) * mouthArea;
    }
    
    // 6. Chin contour
    const chin = Math.sqrt(x * x + (y + 0.6) * (y + 0.6));
    if (chin < 0.18) {
      depth += 0.35 * Math.cos((chin / 0.18) * (Math.PI / 2));
    }
  } else {
    // Subtle background ripple
    depth += Math.sin(x * 1.8 + y * 1.5 + time * 0.8) * 0.02;
  }
  
  // Continuous shifting organic wave ripple running across the entire face
  let waveSpeed = 2.0;
  if (state === 'thinking') waveSpeed = 3.6;
  else if (state === 'alert') waveSpeed = 5.0;
  
  let wave = Math.sin(x * 1.5 - time * waveSpeed) * Math.cos(y * 1.5 + time * (waveSpeed * 0.7)) * 0.08;
  
  // Speak-reactive push/pull kinetics
  if (state === 'speaking') {
    const speechRadius = Math.sqrt(x*x + y*y);
    wave += Math.sin(speechRadius * 2.2 - time * 12.0) * amplitude * 0.15;
    depth += amplitude * 0.2 * Math.cos(Math.min(1.0, speechRadius / 1.6) * (Math.PI / 2));
  }
  
  if (state === 'alert') {
    depth += Math.sin(time * 40.0 + x * 12.0) * 0.03;
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
  const spacing = 0.085; // Perfectly proportioned spacing for high visibility

  // Geometry: Thicker vertical lines of light + tip joint spheres to ensure high visibility
  const boxGeom = React.useMemo(() => new THREE.BoxGeometry(0.035, 0.035, 0.9), []);
  const sphereGeom = React.useMemo(() => new THREE.SphereGeometry(0.045, 6, 6), []);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);

  // Dynamic color interpolation cache
  const tempColor = React.useMemo(() => new THREE.Color(), []);

  // Glowing holographic colors matching the movie screenshots
  let colorMapStart = '#0f354f'; // Glowing translucent base blue (recessed column grid)
  let colorMapEnd = '#8adeff';   // Luminous glowing ice-blue (prominent face features)

  if (state === 'alert') {
    colorMapStart = '#4f0d14'; // Deep red
    colorMapEnd = '#ff4d6a';   // Threat red
  } else if (state === 'speaking') {
    colorMapStart = '#0f4a47'; // Deep teal
    colorMapEnd = '#bbfdff';   // Glowing silver-cyan
  } else if (state === 'thinking') {
    colorMapStart = '#0b325c'; // Deep cobalt
    colorMapEnd = '#00c0ff';   // Electric cyan-blue
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
        const depthRatio = Math.max(0.0, Math.min(1.0, (posZ + 0.2) / 1.25));
        tempColor.lerpColors(colStartObj, colEndObj, depthRatio);

        // Reactively brighten active speech region
        if (state === 'speaking' && Math.abs(posY + 0.26) < 0.15 && Math.abs(posX) < 0.36) {
          tempColor.addScalar(amplitude * 0.15);
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

// Double-layer counter-rotating outer wireframe box enclosure centered around the face (extremely delicate lines)
const HolographicVIKICube = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const outerCubeRef1 = useRef<THREE.Mesh>(null);
  const outerCubeRef2 = useRef<THREE.Mesh>(null);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    if (outerCubeRef1.current) {
      outerCubeRef1.current.rotation.y = time * 0.12;
      outerCubeRef1.current.rotation.x = time * 0.05;
    }
    if (outerCubeRef2.current) {
      outerCubeRef2.current.rotation.y = -time * 0.07;
      outerCubeRef2.current.rotation.z = time * 0.09;
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
        <meshBasicMaterial color={color} wireframe transparent opacity={0.04} blending={THREE.AdditiveBlending} />
      </mesh>
      
      {/* Secondary Inner Cage for Parallax Depth */}
      <mesh ref={outerCubeRef2} scale={0.96}>
        <boxGeometry args={[4.4, 4.4, 4.4]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.02} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
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
          <Suspense fallback={null}>
            <HolographicVIKICube state={vikiState} />
            <VIKIVoxelFace state={vikiState} />
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
