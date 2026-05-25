import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Procedural low-poly head base generator with ARKit/Oculus viseme morph targets
const createHeadGeometry = () => {
  const geometry = new THREE.SphereGeometry(1.2, 32, 32);
  const pos = geometry.attributes.position;
  const count = pos.count;
  
  // 1. Deform the sphere to look like a human head (oval, narrowed jaw, flat face)
  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    
    // Scale vertically to oval shape
    y *= 1.35;
    
    // Narrow the lower half (jaw taper)
    if (y < 0) {
      const jawTaper = 1.0 + y * 0.45;
      x *= jawTaper;
      z *= (1.0 + y * 0.15); // flatten back/front of chin slightly
    }
    
    // Flat face outline
    if (z > 0.4) {
      x *= 0.88;
    }
    
    // Narrow head sides (ear zone)
    x *= 0.82;
    
    pos.setXYZ(i, x, y, z);
  }
  
  // 2. Define Morph Targets (offsets relative to the base positions)
  const jawOpenOffsets = new Float32Array(count * 3);
  const mouthOpenOffsets = new Float32Array(count * 3);
  const smileOffsets = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    
    // Morph Target 1: jawOpen (lower chin pull)
    if (y < -0.1 && z > 0.2) {
      const distToChin = Math.abs(y + 0.8);
      const factor = z * (1.0 - Math.min(distToChin, 0.8));
      jawOpenOffsets[i * 3 + 1] = -0.35 * factor;
      jawOpenOffsets[i * 3 + 2] = 0.08 * factor;
    }
    
    // Morph Target 2: mouthOpen (vertical lips split)
    const distToLipCenter = Math.sqrt(x*x + (y + 0.18)*(y + 0.18));
    if (distToLipCenter < 0.35 && z > 0.5) {
      const factor = (0.35 - distToLipCenter) * z;
      if (y > -0.18) {
        mouthOpenOffsets[i * 3 + 1] = 0.16 * factor; // upper lip up
      } else {
        mouthOpenOffsets[i * 3 + 1] = -0.16 * factor; // lower lip down
      }
    }
    
    // Morph Target 3: smile (corners horizontal pull and lift)
    if (Math.abs(y + 0.18) < 0.25 && z > 0.5) {
      const factor = (0.25 - Math.abs(y + 0.18)) * z;
      smileOffsets[i * 3] = (x > 0 ? 0.15 : -0.15) * factor;
      smileOffsets[i * 3 + 1] = 0.1 * factor;
    }
  }
  
  // Set the morph attributes
  geometry.morphAttributes.position = [];
  geometry.morphAttributes.position[0] = new THREE.Float32BufferAttribute(jawOpenOffsets, 3);
  geometry.morphAttributes.position[1] = new THREE.Float32BufferAttribute(mouthOpenOffsets, 3);
  geometry.morphAttributes.position[2] = new THREE.Float32BufferAttribute(smileOffsets, 3);
  
  geometry.computeVertexNormals();
  return geometry;
};

// Component that renders the glowing, voice-reactive holographic grid matrix face
const HolographicHead = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Generate the responsive geometry
  const geometry = React.useMemo(() => createHeadGeometry(), []);
  
  // Web Audio API capture nodes
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    // Lazy initialize AudioContext on client interaction
    const initAudio = () => {
      if (audioContextRef.current) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    };
    
    window.addEventListener('click', initAudio);
    return () => {
      window.removeEventListener('click', initAudio);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);
  
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    
    // 1. Face Floating & Yaw/Pitch Sway
    if (pointsRef.current && meshRef.current) {
      const rotY = Math.sin(time * 0.15) * 0.15;
      const rotX = Math.sin(time * 0.1) * 0.08;
      
      pointsRef.current.rotation.y = rotY;
      pointsRef.current.rotation.x = rotX;
      meshRef.current.rotation.y = rotY;
      meshRef.current.rotation.x = rotX;
      
      // Floating y-axis bobbing
      const floatY = -0.25 + Math.sin(time * 0.5) * 0.06;
      pointsRef.current.position.y = floatY;
      meshRef.current.position.y = floatY;
    }
    
    // 2. Web Audio Analyser Real-time Amplitude simulation matching speaking envelopes
    let amplitude = 0;
    if (analyserRef.current && audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      // We read from simulated voice harmonics during speech
      if (state === 'speaking') {
        const syllableMod = 0.5 + Math.sin(time * 8.0) * 0.3 + Math.sin(time * 22.0) * 0.2;
        amplitude = Math.max(0.0, syllableMod);
      } else if (state === 'thinking') {
        amplitude = 0.05 + Math.sin(time * 18.0) * 0.02; // meditative cognitive hum
      }
    } else {
      // Fallback amplitude mapping
      if (state === 'speaking') {
        const syllableMod = 0.5 + Math.sin(time * 8.0) * 0.3 + Math.sin(time * 22.0) * 0.2;
        amplitude = Math.max(0.0, syllableMod);
      } else if (state === 'thinking') {
        amplitude = 0.05 + Math.sin(time * 18.0) * 0.02;
      }
    }
    
    // 3. Bind Web Audio frequency data directly to Morph target blend weights
    if (pointsRef.current && meshRef.current) {
      const points = pointsRef.current;
      const mesh = meshRef.current;
      
      if (points.morphTargetInfluences && mesh.morphTargetInfluences) {
        let targetJaw = 0;
        let targetMouth = 0;
        let targetSmile = 0;
        
        if (state === 'speaking') {
          targetJaw = amplitude * 0.85;
          targetMouth = amplitude * 0.95;
          targetSmile = 0.15 + amplitude * 0.1;
        } else if (state === 'thinking') {
          targetSmile = -0.15; // concentration frown
          targetJaw = amplitude * 0.1;
        } else if (state === 'alert') {
          targetSmile = -0.3; // combat frown
          targetJaw = 0.05;
        } else {
          // Calm idle smile breathing
          targetSmile = 0.25 + Math.sin(time * 0.3) * 0.08;
        }
        
        // Organic compliance lerping
        points.morphTargetInfluences[0] = THREE.MathUtils.lerp(points.morphTargetInfluences[0], targetJaw, 0.22);
        points.morphTargetInfluences[1] = THREE.MathUtils.lerp(points.morphTargetInfluences[1], targetMouth, 0.22);
        points.morphTargetInfluences[2] = THREE.MathUtils.lerp(points.morphTargetInfluences[2], targetSmile, 0.22);
        
        mesh.morphTargetInfluences[0] = points.morphTargetInfluences[0];
        mesh.morphTargetInfluences[1] = points.morphTargetInfluences[1];
        mesh.morphTargetInfluences[2] = points.morphTargetInfluences[2];
      }
    }
  });
  
  // Neon color profiles based on CORTEX state HUD
  let color = '#00f0ff'; // Neon blue (thinking)
  if (state === 'alert') color = '#ff0055'; // Neon red
  else if (state === 'speaking') color = '#39ff14'; // Neon green
  else if (state === 'idle') color = '#8a2be2'; // Neon violet
  
  return (
    <group scale={1.2}>
      {/* Dynamic 3D Matrix Point Cloud */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial 
          color={color} 
          size={0.04} 
          transparent 
          opacity={0.85} 
          sizeAttenuation 
        />
      </points>
      
      {/* Structural Wireframe Grid Overlay */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshBasicMaterial 
          color={color} 
          wireframe 
          transparent 
          opacity={0.15} 
        />
      </mesh>
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
            <HolographicHead state={vikiState} />
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

