import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Procedural, highly detailed Cybernetic Female AI Bust
const ProceduralFemaleBust = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const headRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  // Eyelid blink state tracker
  const blinkState = useRef({ isBlinking: false, time: 0, nextBlink: 2.0 });

  useFrame((threeState, delta) => {
    const time = threeState.clock.getElapsedTime();
    const pointer = threeState.pointer;

    // 1. DYNAMIC ORGANIC BREATHING (Chest and Head bobbing)
    const breath = Math.sin(time * 1.5) * 0.02;
    const microBob = Math.cos(time * 3.0) * 0.005;

    if (torsoRef.current) {
      torsoRef.current.position.y = -1.1 + breath * 0.35;
      torsoRef.current.rotation.z = Math.sin(time * 0.75) * 0.005;
    }
    if (headRef.current) {
      headRef.current.position.y = 0.35 + breath * 0.5 + microBob;
      headRef.current.rotation.z = Math.sin(time * 0.75) * 0.008;
    }

    // 2. SMOOTH MOUSE GAZE TRACKING (Head, neck and eyes follow mouse)
    const targetX = pointer.x * 0.45; // Horizontal limit
    const targetY = pointer.y * 0.30; // Vertical limit

    if (headRef.current) {
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetX, 0.08);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -targetY, 0.08);
    }
    if (neckRef.current) {
      neckRef.current.rotation.y = THREE.MathUtils.lerp(neckRef.current.rotation.y, targetX * 0.4, 0.08);
      neckRef.current.rotation.x = THREE.MathUtils.lerp(neckRef.current.rotation.x, -targetY * 0.2, 0.08);
    }

    // 3. DYNAMIC EYE LOOK-AT & BLINKING
    // Random blinking cycle
    const bs = blinkState.current;
    if (time > bs.nextBlink) {
      bs.isBlinking = true;
      bs.time = 0;
      bs.nextBlink = time + 2.5 + Math.random() * 4.0; // Next blink in 2.5 - 6.5s
    }

    if (bs.isBlinking) {
      bs.time += delta * 8.0; // Speed of blink
      const scaleY = Math.max(0.01, Math.abs(Math.sin(bs.time * Math.PI)));
      if (leftEyelidRef.current) leftEyelidRef.current.scale.y = scaleY;
      if (rightEyelidRef.current) rightEyelidRef.current.scale.y = scaleY;
      
      if (bs.time >= 1.0) {
        bs.isBlinking = false;
        if (leftEyelidRef.current) leftEyelidRef.current.scale.y = 0.01; // fully open
        if (rightEyelidRef.current) rightEyelidRef.current.scale.y = 0.01;
      }
    }

    // Eye movement during different states
    let eyeTargetX = targetX * 0.55;
    let eyeTargetY = targetY * 0.55;

    if (state === 'thinking') {
      // Look up and away in thought
      eyeTargetX = 0.15 + Math.sin(time * 2.0) * 0.04;
      eyeTargetY = 0.12 + Math.cos(time * 2.0) * 0.02;
    } else if (state === 'alert') {
      // Dart around alertly
      eyeTargetX = targetX * 0.7 + Math.sin(time * 8.0) * 0.04;
      eyeTargetY = targetY * 0.7 + Math.cos(time * 8.0) * 0.04;
    }

    if (leftEyeRef.current && rightEyeRef.current) {
      leftEyeRef.current.rotation.y = THREE.MathUtils.lerp(leftEyeRef.current.rotation.y, eyeTargetX, 0.15);
      leftEyeRef.current.rotation.x = THREE.MathUtils.lerp(leftEyeRef.current.rotation.x, -eyeTargetY, 0.15);
      rightEyeRef.current.rotation.y = THREE.MathUtils.lerp(rightEyeRef.current.rotation.y, eyeTargetX, 0.15);
      rightEyeRef.current.rotation.x = THREE.MathUtils.lerp(rightEyeRef.current.rotation.x, -eyeTargetY, 0.15);
    }

    // 4. LIP SYNC / MOUTH MOVEMENT FOR SPEAKING
    if (mouthRef.current) {
      if (state === 'speaking') {
        const speakAmt = Math.abs(Math.sin(time * 14.0)) * 0.45 + 0.1;
        mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, speakAmt, 0.2);
        mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, 1.25, 0.2);
      } else {
        mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, 0.1, 0.1);
        mouthRef.current.scale.x = THREE.MathUtils.lerp(mouthRef.current.scale.x, 1.0, 0.1);
      }
    }
  });

  return (
    <group>
      {/* 1. TORSO & SHOULDERS BASE */}
      <group ref={torsoRef} position={[0, -1.1, 0]}>
        {/* Curved collarbones & chest plate */}
        <mesh castShadow receiveShadow>
          <torusGeometry args={[0.55, 0.18, 16, 48, Math.PI]} />
          <meshStandardMaterial 
            color="#1e1b4b" 
            roughness={0.1} 
            metalness={0.9} 
            envMapIntensity={1.5}
          />
        </mesh>
        
        {/* Sleek cybernetic chest base */}
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.45, 0.35, 32]} />
          <meshStandardMaterial 
            color="#0f172a" 
            roughness={0.2} 
            metalness={0.8} 
          />
        </mesh>
        
        {/* Glowing cyber collar ring */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.22, 0.06, 32]} />
          <meshStandardMaterial 
            color={state === 'alert' ? '#ff3050' : state === 'thinking' ? '#00e5ff' : state === 'speaking' ? '#3b82f6' : '#80c0ff'} 
            emissive={state === 'alert' ? '#ff3050' : state === 'thinking' ? '#00e5ff' : state === 'speaking' ? '#3b82f6' : '#80c0ff'}
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>

      {/* 2. NECK (Connected to head but rotates independently) */}
      <mesh ref={neckRef} position={[0, -0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.7, 32]} />
        <meshStandardMaterial 
          color="#fda4af" // Warm premium skin tone
          roughness={0.35} 
          metalness={0.15} 
        />
        {/* High-tech glowing spine line */}
        <mesh position={[0, 0, -0.14]}>
          <boxGeometry args={[0.03, 0.6, 0.02]} />
          <meshBasicMaterial color={state === 'alert' ? '#ff3050' : '#00e5ff'} />
        </mesh>
      </mesh>

      {/* 3. HEAD & FACE GROUP */}
      <group ref={headRef} position={[0, 0.35, 0]}>
        {/* Head Shell (Sleek organic face shape) */}
        <mesh scale={[1, 1.25, 0.95]} castShadow receiveShadow>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshStandardMaterial 
            color="#fda4af" // Warm organic premium skin tone
            roughness={0.3} 
            metalness={0.1} 
            envMapIntensity={1.2}
          />
        </mesh>

        {/* Elegant Futuristic Cybernetic Hair / Helmet */}
        <mesh position={[0, 0.16, -0.06]} scale={[1.02, 1.15, 0.98]} castShadow>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial 
            color="#0b0f19" // Metallic dark hair cap
            roughness={0.15} 
            metalness={0.9} 
          />
        </mesh>
        
        {/* Glowing Headband Accent Line */}
        <mesh position={[0, 0.28, 0.12]} rotation={[0.2, 0, 0]}>
          <torusGeometry args={[0.43, 0.015, 8, 48, Math.PI * 1.1]} />
          <meshStandardMaterial 
            color={state === 'alert' ? '#ff3050' : state === 'thinking' ? '#00e5ff' : state === 'speaking' ? '#3b82f6' : '#80c0ff'} 
            emissive={state === 'alert' ? '#ff3050' : state === 'thinking' ? '#00e5ff' : state === 'speaking' ? '#3b82f6' : '#80c0ff'}
            emissiveIntensity={2.0}
          />
        </mesh>

        {/* EYES */}
        {/* Left Eye Ball */}
        <group position={[-0.15, 0.08, 0.32]}>
          <mesh ref={leftEyeRef} castShadow>
            <sphereGeometry args={[0.07, 32, 32]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
            {/* Pupil/Iris */}
            <mesh position={[0, 0, 0.055]}>
              <sphereGeometry args={[0.038, 16, 16]} />
              <meshStandardMaterial 
                color={state === 'alert' ? '#ff3050' : '#00b0ff'} // Glowing irises
                emissive={state === 'alert' ? '#ff3050' : '#00b0ff'}
                emissiveIntensity={1.2}
                roughness={0.05}
              />
            </mesh>
          </mesh>
          {/* Eyelid (Blink overlay) */}
          <mesh ref={leftEyelidRef} position={[0, 0.07, 0.02]} scale={[1.1, 0.01, 1.1]}>
            <sphereGeometry args={[0.072, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#fda4af" roughness={0.3} />
          </mesh>
        </group>

        {/* Right Eye Ball */}
        <group position={[0.15, 0.08, 0.32]}>
          <mesh ref={rightEyeRef} castShadow>
            <sphereGeometry args={[0.07, 32, 32]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} />
            {/* Pupil/Iris */}
            <mesh position={[0, 0, 0.055]}>
              <sphereGeometry args={[0.038, 16, 16]} />
              <meshStandardMaterial 
                color={state === 'alert' ? '#ff3050' : '#00b0ff'}
                emissive={state === 'alert' ? '#ff3050' : '#00b0ff'}
                emissiveIntensity={1.2}
                roughness={0.05}
              />
            </mesh>
          </mesh>
          {/* Eyelid (Blink overlay) */}
          <mesh ref={rightEyelidRef} position={[0, 0.07, 0.02]} scale={[1.1, 0.01, 1.1]}>
            <sphereGeometry args={[0.072, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#fda4af" roughness={0.3} />
          </mesh>
        </group>

        {/* Sleek, Delicate Nose */}
        <mesh position={[0, -0.04, 0.38]} rotation={[-0.1, 0, 0]} castShadow>
          <coneGeometry args={[0.035, 0.16, 4]} />
          <meshStandardMaterial color="#fda4af" roughness={0.3} />
        </mesh>

        {/* Animated Mouth & Lips */}
        <group position={[0, -0.22, 0.33]} ref={mouthRef}>
          <mesh scale={[1, 0.1, 1]} rotation={[0, 0, Math.PI]} castShadow>
            <torusGeometry args={[0.065, 0.016, 8, 32, Math.PI]} />
            <meshStandardMaterial 
              color="#fb7185" // Soft rose lips
              roughness={0.35} 
              metalness={0.1} 
            />
          </mesh>
        </group>

        {/* Emissive Cybernetic Cheek Lines */}
        <mesh position={[-0.30, -0.08, 0.24]} rotation={[0.1, 0.4, -0.2]}>
          <boxGeometry args={[0.12, 0.006, 0.01]} />
          <meshBasicMaterial color="#00e5ff" />
        </mesh>
        <mesh position={[0.30, -0.08, 0.24]} rotation={[0.1, -0.4, 0.2]}>
          <boxGeometry args={[0.12, 0.006, 0.01]} />
          <meshBasicMaterial color="#00e5ff" />
        </mesh>
      </group>
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();
    
    // Default gorgeous ice-blue cybernetic glow
    const targetColor = new THREE.Color('#80c0ff');
    let targetIntensity = 1.2;
    
    if (state === 'alert') {
      targetColor.set('#ff3050'); // Alarm Crimson Red
      targetIntensity = 2.4 + Math.sin(time * 18.0) * 0.8;
    } else if (state === 'thinking') {
      targetColor.set('#00e5ff'); // Electric Cyan
      targetIntensity = 1.4 + Math.sin(time * 3.5) * 0.3;
    } else if (state === 'speaking') {
      targetColor.set('#3b82f6'); // Conversational Blue
      targetIntensity = 1.8 + Math.sin(time * 10.0) * 0.45;
    } else {
      // Calm organic breathing pulse
      targetIntensity = 1.1 + Math.sin(time * 1.2) * 0.15;
    }
    
    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[-1.8, 1.2, 2.0]} />;
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
        overflow: 'hidden',
        background: '#040711' // Futuristic dark sci-fi viewport void
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas 
          camera={{ position: [0, 0.1, 1.15], fov: 38 }} // Cinematic close-up bust framing focusing on head and shoulders
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          {/* Detailed premium PBR studio lighting setup */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 2.5]} intensity={1.8} castShadow />
          <directionalLight position={[-3, 1.5, -2.5]} intensity={0.65} color="#4b5563" /> {/* Backlight contour */}
          <ReactivePointLight state={vikiState} />

          <Suspense fallback={null}>
            <ProceduralFemaleBust state={vikiState} />
            <Environment preset="city" />
          </Suspense>

          <OrbitControls 
            target={[0, 0.05, 0]} // Focus centered exactly on the head and chest bust projection
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
