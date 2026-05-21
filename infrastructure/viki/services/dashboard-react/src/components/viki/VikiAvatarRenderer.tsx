import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Component that handles loading and animating the 3D asset
const AvatarModel = ({ modelPath, state }: { modelPath: string, state: 'idle' | 'thinking' | 'speaking' | 'alert' }) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations, group);

  // Mapped bones for procedural animation
  const headBoneRef = useRef<THREE.Object3D | null>(null);
  const neckBoneRef = useRef<THREE.Object3D | null>(null);
  const spineBoneRef = useRef<THREE.Object3D | null>(null);
  const lClavicleBoneRef = useRef<THREE.Object3D | null>(null);
  const rClavicleBoneRef = useRef<THREE.Object3D | null>(null);
  const lEyeBoneRef = useRef<THREE.Object3D | null>(null);
  const rEyeBoneRef = useRef<THREE.Object3D | null>(null);
  const lUpperarmBoneRef = useRef<THREE.Object3D | null>(null);
  const lForearmBoneRef = useRef<THREE.Object3D | null>(null);
  const rUpperarmBoneRef = useRef<THREE.Object3D | null>(null);
  const rForearmBoneRef = useRef<THREE.Object3D | null>(null);

  // Blendshapes morph mapping for organic blinks and facial expressions
  const eyeBlinkLeftMorphRef = useRef<{ mesh: THREE.SkinnedMesh; index: number } | null>(null);
  const eyeBlinkRightMorphRef = useRef<{ mesh: THREE.SkinnedMesh; index: number } | null>(null);
  const mouthOpenMorphRef = useRef<{ mesh: THREE.SkinnedMesh; index: number } | null>(null);
  const browDropLeftMorphRef = useRef<{ mesh: THREE.SkinnedMesh; index: number } | null>(null);
  const browDropRightMorphRef = useRef<{ mesh: THREE.SkinnedMesh; index: number } | null>(null);

  // Blink state tracking
  const blinkStateRef = useRef<{
    isBlinking: boolean;
    startTime: number;
    duration: number;
    nextBlinkTime: number;
  }>({
    isBlinking: false,
    startTime: 0,
    duration: 0.25,
    nextBlinkTime: Date.now() + 3000 + Math.random() * 4000
  });

  // Saccadic eye tracking state
  const saccadeStateRef = useRef<{
    nextSaccadeTime: number;
    offsetX: number;
    offsetY: number;
  }>({
    nextSaccadeTime: 0,
    offsetX: 0,
    offsetY: 0
  });

  // Gesture state tracking
  const gestureStateRef = useRef<{ name: 'none' | 'wave' | 'jolt'; startTime: number }>({ name: 'none', startTime: 0 });

  // Track mouse position globally
  const mouseRef = useRef({ x: 0, y: 0, lastMoved: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize coordinate space to [-1, 1]
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.lastMoved = Date.now();
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Map bones and scan blendshapes once the scene is loaded
  useEffect(() => {
    if (scene) {
      headBoneRef.current = scene.getObjectByName('CC_Base_Head_039') || null;
      neckBoneRef.current = scene.getObjectByName('CC_Base_NeckTwist01_037') || null;
      spineBoneRef.current = scene.getObjectByName('CC_Base_Spine02_036') || null;
      lClavicleBoneRef.current = scene.getObjectByName('CC_Base_L_Clavicle_050') || null;
      rClavicleBoneRef.current = scene.getObjectByName('CC_Base_R_Clavicle_062') || null;
      lEyeBoneRef.current = scene.getObjectByName('CC_Base_L_Eye_047') || null;
      rEyeBoneRef.current = scene.getObjectByName('CC_Base_R_Eye_046') || null;
      lUpperarmBoneRef.current = scene.getObjectByName('CC_Base_L_Upperarm_051') || null;
      lForearmBoneRef.current = scene.getObjectByName('CC_Base_L_Forearm_052') || null;
      rUpperarmBoneRef.current = scene.getObjectByName('CC_Base_R_Upperarm_063') || null;
      rForearmBoneRef.current = scene.getObjectByName('CC_Base_R_Forearm_064') || null;

      // Identify blinking and facial expression morph targets in the skinned mesh hierarchy
      scene.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          for (const [key, value] of Object.entries(dict)) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('eye_blink_l') || lowerKey.includes('eyeblinkleft') || lowerKey.includes('blink_l') || lowerKey.includes('blink_left')) {
              eyeBlinkLeftMorphRef.current = { mesh: child, index: value };
            }
            if (lowerKey.includes('eye_blink_r') || lowerKey.includes('eyeblinkright') || lowerKey.includes('blink_r') || lowerKey.includes('blink_right')) {
              eyeBlinkRightMorphRef.current = { mesh: child, index: value };
            }
            if (lowerKey.includes('mouth_open') || lowerKey.includes('jaw_open') || lowerKey.includes('mouthopen') || lowerKey.includes('jawopen')) {
              mouthOpenMorphRef.current = { mesh: child, index: value };
            }
            if (lowerKey.includes('brow_drop_l') || lowerKey.includes('brow_squeeze_l') || lowerKey.includes('browsqueezeleft')) {
              browDropLeftMorphRef.current = { mesh: child, index: value };
            }
            if (lowerKey.includes('brow_drop_r') || lowerKey.includes('brow_squeeze_r') || lowerKey.includes('browsqueezeright')) {
              browDropRightMorphRef.current = { mesh: child, index: value };
            }
          }
        }
      });

      // Reset default rotations
      if (headBoneRef.current) headBoneRef.current.rotation.set(0, 0, 0);
      if (neckBoneRef.current) neckBoneRef.current.rotation.set(0, 0, 0);
      if (spineBoneRef.current) spineBoneRef.current.rotation.set(0, 0, 0);
      if (lClavicleBoneRef.current) lClavicleBoneRef.current.rotation.set(0, 0, 0);
      if (rClavicleBoneRef.current) rClavicleBoneRef.current.rotation.set(0, 0, 0);
      if (lEyeBoneRef.current) lEyeBoneRef.current.rotation.set(0, 0, 0);
      if (rEyeBoneRef.current) rEyeBoneRef.current.rotation.set(0, 0, 0);
      if (lUpperarmBoneRef.current) lUpperarmBoneRef.current.rotation.set(0, 0, 0);
      if (lForearmBoneRef.current) lForearmBoneRef.current.rotation.set(0, 0, 0);
      if (rUpperarmBoneRef.current) rUpperarmBoneRef.current.rotation.set(0, 0, 0);
      if (rForearmBoneRef.current) rForearmBoneRef.current.rotation.set(0, 0, 0);
    }
  }, [scene]);

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

  // Procedural animation loop running after the default mixer updates (priority 1)
  useFrame((threeState) => {
    const time = threeState.clock.getElapsedTime();
    const nowMs = Date.now();

    if (group.current) {
      // Subtle float offset in Y - lowered base to -3.35 and reduced bobbing amplitude to 0.015 to feel grounded on platform
      group.current.position.y = -3.35 + Math.sin(time * 0.4) * 0.015;
      // Soft floating yaw sway
      group.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }

    // Configure dynamic breathing rates based on state (slower in thinking, faster in alert)
    let breathingSpeed = 1.2;
    let breathingAmpSpine = 0.015;
    let breathingAmpClavicle = 0.005;

    if (state === 'alert') {
      breathingSpeed = 3.0;
      breathingAmpSpine = 0.025;
      breathingAmpClavicle = 0.008;
    } else if (state === 'thinking') {
      breathingSpeed = 0.7;
      breathingAmpSpine = 0.022;
      breathingAmpClavicle = 0.004;
    } else if (state === 'speaking') {
      breathingSpeed = 1.6;
      breathingAmpSpine = 0.018;
      breathingAmpClavicle = 0.006;
    }

    // Gentle chest expansion (breathing) mapped to the Spine bone
    if (spineBoneRef.current) {
      const breathing = Math.sin(time * breathingSpeed) * breathingAmpSpine;
      spineBoneRef.current.rotation.x = breathing;
    }

    // Procedural Clavicle (Shoulder) Breathing elevation
    if (lClavicleBoneRef.current) {
      lClavicleBoneRef.current.rotation.z = -Math.sin(time * breathingSpeed) * breathingAmpClavicle;
      lClavicleBoneRef.current.rotation.x = Math.sin(time * breathingSpeed) * (breathingAmpClavicle * 0.6);
    }
    if (rClavicleBoneRef.current) {
      rClavicleBoneRef.current.rotation.z = Math.sin(time * breathingSpeed) * breathingAmpClavicle;
      rClavicleBoneRef.current.rotation.x = Math.sin(time * breathingSpeed) * (breathingAmpClavicle * 0.6);
    }

    // Determine target head angles based on mouse tracking or random sways
    let targetHeadYaw = 0;
    let targetHeadPitch = 0;
    let targetHeadRoll = 0;

    const isMouseActive = nowMs - mouseRef.current.lastMoved < 4000; // active in last 4 seconds

    // Automatically trigger alert jolt gesture on state change
    if (state === 'alert' && gestureStateRef.current.name !== 'jolt') {
      gestureStateRef.current = { name: 'jolt', startTime: Date.now() };
    }

    // Automatically trigger greeting wave gesture when starting to speak
    if (state === 'speaking' && gestureStateRef.current.name === 'none') {
      gestureStateRef.current = { name: 'wave', startTime: Date.now() };
    }

    if (state === 'thinking') {
      // Thinking state: Analytical gaze, looking upward and slightly to the left
      targetHeadYaw = -0.25 + Math.sin(time * 0.2) * 0.03;
      targetHeadPitch = 0.22 + Math.cos(time * 0.15) * 0.02;
      targetHeadRoll = -0.12;
    } else if (state === 'speaking') {
      // Speaking state: Nodding bob cycles simulating speech rhythm
      const vocalBob = Math.sin(time * 4.5) * 0.05 + Math.cos(time * 8) * 0.02;
      const conversationalSway = Math.sin(time * 1.3) * 0.06;

      targetHeadYaw = conversationalSway;
      targetHeadPitch = -0.04 + vocalBob;
      targetHeadRoll = Math.sin(time * 2.2) * 0.03;
    } else {
      // Idle state: Mouse tracking or organic look-around
      if (isMouseActive) {
        // Track the mouse cursor
        targetHeadYaw = mouseRef.current.x * 0.55;  // horizontal turn range
        targetHeadPitch = mouseRef.current.y * 0.35; // vertical look range
        targetHeadRoll = mouseRef.current.x * 0.08;  // subtle roll on turn
      } else {
        // Organic idle gaze drift
        targetHeadYaw = Math.sin(time * 0.25) * 0.12 + Math.cos(time * 0.11) * 0.08;
        targetHeadPitch = Math.cos(time * 0.22) * 0.06 + Math.sin(time * 0.08) * 0.04;
        targetHeadRoll = targetHeadYaw * 0.08;
      }
    }

    // Smoothly interpolate (LERP) bone rotations for fluid, lifelike movements
    if (headBoneRef.current) {
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, targetHeadYaw, 0.06);
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, targetHeadPitch, 0.06);
      headBoneRef.current.rotation.z = THREE.MathUtils.lerp(headBoneRef.current.rotation.z, targetHeadRoll, 0.06);
    }

    if (neckBoneRef.current) {
      // Neck follows head motion with slightly reduced range
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(neckBoneRef.current.rotation.y, targetHeadYaw * 0.25, 0.06);
      neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(neckBoneRef.current.rotation.x, targetHeadPitch * 0.25, 0.06);
    }

    // Organic Saccadic movements
    if (nowMs >= saccadeStateRef.current.nextSaccadeTime) {
      // 30% chance of micro-saccade
      if (Math.random() < 0.3) {
        saccadeStateRef.current.offsetX = (Math.random() - 0.5) * 0.08;
        saccadeStateRef.current.offsetY = (Math.random() - 0.5) * 0.05;
      } else {
        saccadeStateRef.current.offsetX = 0;
        saccadeStateRef.current.offsetY = 0;
      }
      saccadeStateRef.current.nextSaccadeTime = nowMs + 600 + Math.random() * 2000;
    }

    // Procedural Eye Gaze Tracking (Combining gaze target and organic saccades)
    let targetEyeYaw = saccadeStateRef.current.offsetX;
    let targetEyePitch = saccadeStateRef.current.offsetY;

    if (state === 'idle' && isMouseActive) {
      targetEyeYaw += mouseRef.current.x * 0.25;
      targetEyePitch += mouseRef.current.y * 0.15;
    } else if (state === 'alert') {
      targetEyeYaw += (Math.random() - 0.5) * 0.15;
      targetEyePitch += (Math.random() - 0.5) * 0.08;
    } else {
      targetEyeYaw += Math.sin(time * 0.4) * 0.04;
      targetEyePitch += Math.cos(time * 0.3) * 0.02;
    }

    if (lEyeBoneRef.current) {
      lEyeBoneRef.current.rotation.y = THREE.MathUtils.lerp(lEyeBoneRef.current.rotation.y, targetEyeYaw, 0.1);
      lEyeBoneRef.current.rotation.x = THREE.MathUtils.lerp(lEyeBoneRef.current.rotation.x, targetEyePitch, 0.1);
    }
    if (rEyeBoneRef.current) {
      rEyeBoneRef.current.rotation.y = THREE.MathUtils.lerp(rEyeBoneRef.current.rotation.y, targetEyeYaw, 0.1);
      rEyeBoneRef.current.rotation.x = THREE.MathUtils.lerp(rEyeBoneRef.current.rotation.x, targetEyePitch, 0.1);
    }

    // Eyelid Blinking logic (0 = open, 1 = closed)
    let blinkValue = 0;

    if (!blinkStateRef.current.isBlinking) {
      if (nowMs >= blinkStateRef.current.nextBlinkTime) {
        blinkStateRef.current.isBlinking = true;
        blinkStateRef.current.startTime = nowMs;
        blinkStateRef.current.duration = 0.18 + Math.random() * 0.08; // 180ms - 260ms
      }
    } else {
      const elapsed = (nowMs - blinkStateRef.current.startTime) / 1000;
      const duration = blinkStateRef.current.duration;
      
      if (elapsed >= duration) {
        blinkStateRef.current.isBlinking = false;
        blinkStateRef.current.nextBlinkTime = nowMs + 2000 + Math.random() * 5000; // Next blink in 2-7s
      } else {
        const halfDuration = duration / 2;
        if (elapsed < halfDuration) {
          blinkValue = elapsed / halfDuration; // Closing
        } else {
          blinkValue = 1 - (elapsed - halfDuration) / halfDuration; // Opening
        }
      }
    }

    // Apply blink value to mesh morphTargetInfluences if present
    if (eyeBlinkLeftMorphRef.current && eyeBlinkLeftMorphRef.current.mesh.morphTargetInfluences) {
      eyeBlinkLeftMorphRef.current.mesh.morphTargetInfluences[eyeBlinkLeftMorphRef.current.index] = blinkValue;
    }
    if (eyeBlinkRightMorphRef.current && eyeBlinkRightMorphRef.current.mesh.morphTargetInfluences) {
      eyeBlinkRightMorphRef.current.mesh.morphTargetInfluences[eyeBlinkRightMorphRef.current.index] = blinkValue;
    }

    // Fallback: Scale eyes vertically if morph targets are missing
    if (!eyeBlinkLeftMorphRef.current && lEyeBoneRef.current) {
      lEyeBoneRef.current.scale.y = THREE.MathUtils.lerp(lEyeBoneRef.current.scale.y, 1 - blinkValue * 0.9, 0.3);
    }
    if (!eyeBlinkRightMorphRef.current && rEyeBoneRef.current) {
      rEyeBoneRef.current.scale.y = THREE.MathUtils.lerp(rEyeBoneRef.current.scale.y, 1 - blinkValue * 0.9, 0.3);
    }

    // Lip sync / mouth movement when speaking
    let mouthOpenValue = 0;
    if (state === 'speaking') {
      mouthOpenValue = Math.max(0, Math.sin(time * 12) * 0.45 + Math.cos(time * 8) * 0.2 + 0.35);
    }

    if (mouthOpenMorphRef.current && mouthOpenMorphRef.current.mesh.morphTargetInfluences) {
      mouthOpenMorphRef.current.mesh.morphTargetInfluences[mouthOpenMorphRef.current.index] = THREE.MathUtils.lerp(
        mouthOpenMorphRef.current.mesh.morphTargetInfluences[mouthOpenMorphRef.current.index],
        mouthOpenValue,
        0.2
      );
    }

    // Analytical brow dropping when thinking
    let browValue = state === 'thinking' ? 0.65 : 0.0;
    if (browDropLeftMorphRef.current && browDropLeftMorphRef.current.mesh.morphTargetInfluences) {
      browDropLeftMorphRef.current.mesh.morphTargetInfluences[browDropLeftMorphRef.current.index] = THREE.MathUtils.lerp(
        browDropLeftMorphRef.current.mesh.morphTargetInfluences[browDropLeftMorphRef.current.index],
        browValue,
        0.1
      );
    }
    if (browDropRightMorphRef.current && browDropRightMorphRef.current.mesh.morphTargetInfluences) {
      browDropRightMorphRef.current.mesh.morphTargetInfluences[browDropRightMorphRef.current.index] = THREE.MathUtils.lerp(
        browDropRightMorphRef.current.mesh.morphTargetInfluences[browDropRightMorphRef.current.index],
        browValue,
        0.1
      );
    }

    // Procedural Interactive Gestures & natural, premium relaxed resting arm pose (hanging down by the side)
    let targetRUpperarmX = 0;
    let targetRUpperarmY = 0;
    let targetRUpperarmZ = 0;
    let targetRForearmX = 0;
    let targetRForearmY = 0;
    let targetRForearmZ = 0;

    let targetLUpperarmX = 0;
    let targetLUpperarmY = 0;
    let targetLUpperarmZ = 0;
    let targetLForearmX = 0;
    let targetLForearmY = 0;
    let targetLForearmZ = 0;

    const gesture = gestureStateRef.current.name;
    const gestureElapsed = (Date.now() - gestureStateRef.current.startTime) / 1000;

    if (gesture === 'none') {
      // Natural resting arm pose with a very subtle breathing sway to look fluid and alive
      const armSway = Math.sin(time * breathingSpeed) * 0.025;
      
      targetRUpperarmX = 0.1;
      targetRUpperarmY = 0.05;
      targetRUpperarmZ = 1.35 + armSway;
      targetRForearmX = 0.0;
      targetRForearmY = 0.25;
      targetRForearmZ = 0.0;

      targetLUpperarmX = 0.1;
      targetLUpperarmY = -0.05;
      targetLUpperarmZ = -1.35 - armSway;
      targetLForearmX = 0.0;
      targetLForearmY = -0.25;
      targetLForearmZ = 0.0;
    } else if (gesture === 'wave') {
      if (gestureElapsed < 2.5) {
        // Animate right arm lift
        targetRUpperarmX = -0.4;
        targetRUpperarmZ = -1.2;
        targetRForearmY = 0.9;
        // sinus waving
        targetRForearmZ = Math.sin(time * 10) * 0.35;

        // Keep left arm relaxed
        targetLUpperarmX = 0.1;
        targetLUpperarmY = -0.05;
        targetLUpperarmZ = -1.35;
        targetLForearmY = -0.25;
      } else {
        gestureStateRef.current.name = 'none';
      }
    } else if (gesture === 'jolt') {
      if (gestureElapsed < 1.0) {
        const joltIntensity = Math.sin(time * 50) * 0.05;
        // Shiver while keeping them hanging downwards
        targetRUpperarmX = 0.1;
        targetRUpperarmZ = 1.35 + joltIntensity;
        targetLUpperarmX = 0.1;
        targetLUpperarmZ = -1.35 - joltIntensity;
        
        // Rapid head shiver
        if (headBoneRef.current) {
          headBoneRef.current.rotation.y += Math.sin(time * 60) * 0.1;
          headBoneRef.current.rotation.x += Math.cos(time * 60) * 0.06;
        }
        if (lClavicleBoneRef.current) {
          lClavicleBoneRef.current.rotation.z += Math.sin(time * 55) * 0.04;
        }
        if (rClavicleBoneRef.current) {
          rClavicleBoneRef.current.rotation.z -= Math.sin(time * 55) * 0.04;
        }
      } else {
        gestureStateRef.current.name = 'none';
      }
    }

    if (rUpperarmBoneRef.current) {
      rUpperarmBoneRef.current.rotation.x = THREE.MathUtils.lerp(rUpperarmBoneRef.current.rotation.x, targetRUpperarmX, 0.08);
      rUpperarmBoneRef.current.rotation.y = THREE.MathUtils.lerp(rUpperarmBoneRef.current.rotation.y, targetRUpperarmY, 0.08);
      rUpperarmBoneRef.current.rotation.z = THREE.MathUtils.lerp(rUpperarmBoneRef.current.rotation.z, targetRUpperarmZ, 0.08);
    }
    if (rForearmBoneRef.current) {
      rForearmBoneRef.current.rotation.x = THREE.MathUtils.lerp(rForearmBoneRef.current.rotation.x, targetRForearmX, 0.08);
      rForearmBoneRef.current.rotation.y = THREE.MathUtils.lerp(rForearmBoneRef.current.rotation.y, targetRForearmY, 0.08);
      rForearmBoneRef.current.rotation.z = THREE.MathUtils.lerp(rForearmBoneRef.current.rotation.z, targetRForearmZ, 0.08);
    }
    if (lUpperarmBoneRef.current) {
      lUpperarmBoneRef.current.rotation.x = THREE.MathUtils.lerp(lUpperarmBoneRef.current.rotation.x, targetLUpperarmX, 0.08);
      lUpperarmBoneRef.current.rotation.y = THREE.MathUtils.lerp(lUpperarmBoneRef.current.rotation.y, targetLUpperarmY, 0.08);
      lUpperarmBoneRef.current.rotation.z = THREE.MathUtils.lerp(lUpperarmBoneRef.current.rotation.z, targetLUpperarmZ, 0.08);
    }
    if (lForearmBoneRef.current) {
      lForearmBoneRef.current.rotation.x = THREE.MathUtils.lerp(lForearmBoneRef.current.rotation.x, targetLForearmX, 0.08);
      lForearmBoneRef.current.rotation.y = THREE.MathUtils.lerp(lForearmBoneRef.current.rotation.y, targetLForearmY, 0.08);
      lForearmBoneRef.current.rotation.z = THREE.MathUtils.lerp(lForearmBoneRef.current.rotation.z, targetLForearmZ, 0.08);
    }

  });
  
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    // Do not overwrite an ongoing jolt alert gesture
    if (gestureStateRef.current.name !== 'jolt') {
      gestureStateRef.current = { name: 'wave', startTime: Date.now() };
    }
  };

  return (
    <group ref={group} onPointerDown={handlePointerDown}>
      <primitive 
        object={scene} 
        position={[0, 0, 0]} 
        scale={1.5} 
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
          camera={{ position: [0, -0.65, 6.7], fov: 42 }} // Lowered and pulled back to encompass the whole holographic platform and lower legs without clipping
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
            target={[0, -1.45, 0]}
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

