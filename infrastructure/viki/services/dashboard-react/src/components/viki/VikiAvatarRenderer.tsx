import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that loads, compiles, and animates the high-fidelity Sphere Bot model
const SphereBotModel = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  
  // Dynamic GLTF Loader caching the sphere bot model
  const { scene, animations } = useGLTF('/assets/sphere_bot.glb');
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Setup animations using three-stdlib / drei useAnimations hook
  const { actions } = useAnimations(animations, sceneRef);

  // 1. WebGL/Linux Stability: Convert geometries to non-indexed to prevent index buffer underflows in Mesa drivers
  React.useMemo(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mesh = child;
        mesh.matrixAutoUpdate = true;
        
        if (mesh.geometry && mesh.geometry.index) {
          mesh.geometry = mesh.geometry.toNonIndexed();
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.roughness = Math.min(mat.roughness, 0.35); // Sleeker robotic shell
          mat.metalness = Math.max(mat.metalness, 0.9); // Extremely high metallic cyber finish
        }
      }
    });
  }, [scene]);

  // 2. Play the baked stand/walk/hydraulic loop
  React.useEffect(() => {
    if (!actions) return;
    const action = actions['Animation'];
    if (action) {
      action.reset().fadeIn(0.5).play();
    }
  }, [actions]);

  // 3. Dynamic animation speed, bobbing kinetics, and continuous rotation in useFrame
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();

    if (actions && actions['Animation']) {
      let speed = 1.0;
      if (state === 'alert') speed = 2.0;
      else if (state === 'thinking') speed = 0.5;
      else if (state === 'speaking') speed = 1.35;
      actions['Animation'].timeScale = speed;
    }

    if (group.current) {
      let bob = 0;
      let rotY = time * 0.15;
      let rotX = 0;
      let rotZ = 0;

      if (state === 'speaking') {
        // Energetic bouncing / speaking cadence
        bob = Math.sin(time * 5.0) * 0.12;
        rotX = Math.sin(time * 6.0) * 0.05; // slight head nodding
        rotY = Math.sin(time * 1.5) * 0.2 + (time * 0.05); // swaying and slow turning
      } else if (state === 'thinking') {
        // Contemplative rocking, shifting side-to-side
        bob = Math.sin(time * 1.8) * 0.04;
        rotY = Math.sin(time * 0.8) * 0.3; // scan side to side
        rotZ = Math.sin(time * 1.2) * 0.04; // slight tilt
      } else if (state === 'alert') {
        // Fast alert vibration, fast scanning
        bob = Math.sin(time * 10.0) * 0.03;
        rotY = Math.sin(time * 4.0) * 0.4 + (time * 0.1);
        rotX = 0.05; // tilted forward slightly
      } else {
        // Calm slow idle bobbing
        bob = Math.sin(time * 1.2) * 0.05;
        rotY = time * 0.1; // slow continuous showcase spin
      }

      group.current.position.y = bob;
      group.current.rotation.y = rotY;
      group.current.rotation.x = rotX;
      group.current.rotation.z = rotZ;
    }
  });

  return (
    <group ref={group} scale={[0.65, 0.65, 0.65]}>
      {/* Shift primitive down by exactly 1.0 unit to center the bot visually */}
      <primitive object={scene} position={[0, -1.0, 0]} />
    </group>
  );
};

const ReactivePointLight = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((threeState) => {
    if (!lightRef.current) return;
    const time = threeState.clock.getElapsedTime();

    const targetColor = new THREE.Color('#9b5de5');
    let targetIntensity: number;

    if (state === 'alert') {
      targetColor.set('#ff003c');
      targetIntensity = 2.5 + Math.sin(time * 16) * 0.8; // Strong rapid alarm pulse
    } else if (state === 'thinking') {
      targetColor.set('#00f0ff');
      targetIntensity = 1.5 + Math.sin(time * 2.5) * 0.4; // Breathing calculations pulse
    } else if (state === 'speaking') {
      targetColor.set('#ffb703');
      targetIntensity = 2.0 + Math.sin(time * 9) * 0.5; // Active verbal telemetry glow
    } else {
      targetIntensity = 1.2 + Math.sin(time * 0.9) * 0.2; // Slow idle pulse
    }

    lightRef.current.color.lerp(targetColor, 0.08);
    lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, 0.08);
  });

  return <pointLight ref={lightRef} position={[0, 0.5, 2.0]} distance={5} decay={2} />;
};

const DynamicOrbitingLights = () => {
  const lightRef1 = useRef<THREE.PointLight>(null);
  const lightRef2 = useRef<THREE.PointLight>(null);

  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();

    // Orbiting Cyan Light (horizontal circle)
    if (lightRef1.current) {
      lightRef1.current.position.x = Math.sin(time * 0.8) * 3.5;
      lightRef1.current.position.z = Math.cos(time * 0.8) * 3.5;
      lightRef1.current.position.y = 0.5 + Math.sin(time * 0.4) * 0.5;
    }

    // Orbiting Magenta Light (slanted diagonal circle)
    if (lightRef2.current) {
      lightRef2.current.position.x = Math.cos(time * 1.1) * 3.0;
      lightRef2.current.position.y = Math.sin(time * 1.1) * 2.5 + 0.8;
      lightRef2.current.position.z = Math.sin(time * 1.1) * 2.0;
    }
  });

  return (
    <>
      {/* Specular accent lights circling the bot to create gorgeous sweeps and reflections */}
      <pointLight ref={lightRef1} intensity={1.8} distance={8} color="#00f0ff" />
      <pointLight ref={lightRef2} intensity={2.2} distance={8} color="#ff007f" />
    </>
  );
};

const ReactiveGridAndFog = ({ state }: { state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame((threeState) => {
    // Target cyber colors
    const targetFogColor = new THREE.Color('#040711');
    const targetAmbientColor = new THREE.Color('#081b33');
    
    if (state === 'alert') {
      targetFogColor.set('#1a030a');
      targetAmbientColor.set('#2d050f');
    } else if (state === 'thinking') {
      targetFogColor.set('#031215');
      targetAmbientColor.set('#051d24');
    } else if (state === 'speaking') {
      targetFogColor.set('#161003');
      targetAmbientColor.set('#241a05');
    }
    
    // Lerp fog color
    if (threeState.scene.fog && (threeState.scene.fog as THREE.Fog).color) {
      (threeState.scene.fog as THREE.Fog).color.lerp(targetFogColor, 0.05);
    }
    
    // Lerp ambient light
    if (ambientRef.current) {
      ambientRef.current.color.lerp(targetAmbientColor, 0.05);
    }
  });

  return (
    <>
      <fog attach="fog" args={['#040711', 1.5, 6.0]} />
      <ambientLight ref={ambientRef} intensity={0.7} />
    </>
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
        overflow: 'hidden',
        background: '#040711' // Futuristic dark sci-fi viewport void
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <Canvas
          camera={{ position: [0, 0.5, 3.8], fov: 40 }} // Perfect mid-ground framing for the 2m tall bot
          style={{ width: '100%', height: '100%' }}
          dpr={[1, 2]}
        >
          {/* Reactive cybernetic grid, fog, and ambient matrices */}
          <ReactiveGridAndFog state={vikiState} />
          
          {/* Key Light - Warm solar tint */}
          <directionalLight position={[5, 8, 5]} intensity={2.2} color="#fff6e0" castShadow />
          
          {/* Fill Light - Soft cool cyber tint */}
          <directionalLight position={[-5, 3, -2]} intensity={0.8} color="#a5f3fc" />
          
          {/* Rim Light - Highlights contours from behind */}
          <directionalLight position={[-2, 10, -6]} intensity={2.0} color="#e0f2fe" />
          
          {/* State-Reactive Central Core Light */}
          <ReactivePointLight state={vikiState} />

          {/* Dynamic Speckle Orbiting Specular System */}
          <DynamicOrbitingLights />

          <Suspense fallback={null}>
            <SphereBotModel state={vikiState} />
          </Suspense>

          <OrbitControls
            target={[0, 0, 0]} // Centered exactly at the origin
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

// Preload the Sphere Bot asset to prevent initialization delays on mount
useGLTF.preload('/assets/sphere_bot.glb');
