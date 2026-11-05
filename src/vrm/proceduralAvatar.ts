import * as THREE from 'three';
import { CharacterProfile } from '../types/character.js';
import { AvatarEmotion } from '../types/chat.js';

export interface AvatarController {
  root: THREE.Group;
  update: (delta: number) => void;
  setExpression: (emotion: AvatarEmotion, weight: number) => void;
  setBlink: (weight: number) => void;
  setViseme: (viseme: 'aa' | 'ih' | 'ou' | 'ee' | 'oh', weight: number) => void;
  lookAt: (target: THREE.Vector3) => void;
  dispose: () => void;
}

/**
 * Creates a high-fidelity stylized 3D character mesh with head tracking,
 * blinking eyelids, mouth visemes, and emotional blend shapes.
 */
export function createProceduralAvatar(character: CharacterProfile): AvatarController {
  const root = new THREE.Group();
  root.name = `avatar_${character.id}`;

  // Shared materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: '#FFE2D1',
    roughness: 0.6,
    metalness: 0.05,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: character.hairColor,
    roughness: 0.4,
    metalness: 0.1,
  });

  const eyesMat = new THREE.MeshStandardMaterial({
    color: character.eyeColor,
    roughness: 0.1,
    metalness: 0.2,
    emissive: character.eyeColor,
    emissiveIntensity: 0.25,
  });

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.3,
  });

  const pupilMat = new THREE.MeshBasicMaterial({
    color: '#0B0F19',
  });

  const clothMat = new THREE.MeshStandardMaterial({
    color: character.clothColor,
    roughness: 0.5,
    metalness: 0.1,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: character.accentColor,
    roughness: 0.2,
    metalness: 0.4,
    emissive: character.glowColor,
    emissiveIntensity: 0.35,
  });

  const mouthMat = new THREE.MeshBasicMaterial({
    color: '#C24153',
  });

  // Base structure: Torso -> Neck -> Head
  const torsoGroup = new THREE.Group();
  root.add(torsoGroup);

  // Bust / Shoulders
  const torsoGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.7, 16);
  const torso = new THREE.Mesh(torsoGeo, clothMat);
  torso.position.y = -0.35;
  torsoGroup.add(torso);

  // Collar & cyber lapel
  const collarGeo = new THREE.TorusGeometry(0.24, 0.04, 8, 24);
  const collar = new THREE.Mesh(collarGeo, accentMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.02;
  torsoGroup.add(collar);

  // Glowing cyber badge / crest
  const badgeGeo = new THREE.BoxGeometry(0.08, 0.12, 0.04);
  const badge = new THREE.Mesh(badgeGeo, accentMat);
  badge.position.set(0.18, -0.15, 0.35);
  torsoGroup.add(badge);

  // Neck
  const neckBone = new THREE.Group();
  neckBone.position.y = 0.08;
  torsoGroup.add(neckBone);

  const neckGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.22, 16);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.06;
  neckBone.add(neck);

  // Head Bone (pivot for lookAt)
  const headBone = new THREE.Group();
  headBone.position.y = 0.22;
  neckBone.add(headBone);

  // Head mesh
  const headGeo = new THREE.SphereGeometry(0.36, 32, 24);
  headGeo.scale(1.0, 1.15, 1.05);
  const head = new THREE.Mesh(headGeo, skinMat);
  headBone.add(head);

  // Chin contour
  const chinGeo = new THREE.ConeGeometry(0.18, 0.25, 16);
  chinGeo.scale(1.0, 1.0, 0.7);
  const chin = new THREE.Mesh(chinGeo, skinMat);
  chin.rotation.x = Math.PI;
  chin.position.set(0, -0.3, 0.1);
  headBone.add(chin);

  // Eyes & Eyelids
  const leftEyeGroup = new THREE.Group();
  const rightEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(0.13, 0.02, 0.32);
  rightEyeGroup.position.set(-0.13, 0.02, 0.32);
  headBone.add(leftEyeGroup);
  headBone.add(rightEyeGroup);

  // Eye whites
  const eyeWhiteGeo = new THREE.SphereGeometry(0.085, 16, 16);
  eyeWhiteGeo.scale(1.1, 1.25, 0.4);

  const leftWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  const rightWhite = new THREE.Mesh(eyeWhiteGeo.clone(), eyeWhiteMat);
  leftEyeGroup.add(leftWhite);
  rightEyeGroup.add(rightWhite);

  // Irises
  const irisGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16);
  irisGeo.rotateX(Math.PI / 2);

  const leftIris = new THREE.Mesh(irisGeo, eyesMat);
  leftIris.position.z = 0.032;
  leftEyeGroup.add(leftIris);

  const rightIris = new THREE.Mesh(irisGeo.clone(), eyesMat);
  rightIris.position.z = 0.032;
  rightEyeGroup.add(rightIris);

  // Pupils with shine
  const pupilGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.022, 12);
  pupilGeo.rotateX(Math.PI / 2);

  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.z = 0.035;
  leftEyeGroup.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeo.clone(), pupilMat);
  rightPupil.position.z = 0.035;
  rightEyeGroup.add(rightPupil);

  // Eye catchlights (sparkling anime shine)
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const catchlightGeo1 = new THREE.SphereGeometry(0.014, 8, 8);
  const leftCatch1 = new THREE.Mesh(catchlightGeo1, catchlightMat);
  leftCatch1.position.set(0.015, 0.018, 0.048);
  leftEyeGroup.add(leftCatch1);

  const rightCatch1 = new THREE.Mesh(catchlightGeo1.clone(), catchlightMat);
  rightCatch1.position.set(0.015, 0.018, 0.048);
  rightEyeGroup.add(rightCatch1);

  const catchlightGeo2 = new THREE.SphereGeometry(0.007, 8, 8);
  const leftCatch2 = new THREE.Mesh(catchlightGeo2, catchlightMat);
  leftCatch2.position.set(-0.012, -0.012, 0.048);
  leftEyeGroup.add(leftCatch2);

  const rightCatch2 = new THREE.Mesh(catchlightGeo2.clone(), catchlightMat);
  rightCatch2.position.set(-0.012, -0.012, 0.048);
  rightEyeGroup.add(rightCatch2);

  // Eyelids for blinking
  const eyelidGeo = new THREE.SphereGeometry(0.09, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  eyelidGeo.scale(1.15, 1.3, 0.45);

  const leftEyelid = new THREE.Mesh(eyelidGeo, skinMat);
  leftEyelid.position.set(0, 0.04, 0.03);
  leftEyelid.rotation.x = -Math.PI / 2;
  leftEyeGroup.add(leftEyelid);

  const rightEyelid = new THREE.Mesh(eyelidGeo.clone(), skinMat);
  rightEyelid.position.set(0, 0.04, 0.03);
  rightEyelid.rotation.x = -Math.PI / 2;
  rightEyeGroup.add(rightEyelid);

  // Rosy anime cheek blush
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xff6584,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const blushGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.005, 16);
  blushGeo.rotateX(Math.PI / 2);

  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(0.18, -0.06, 0.35);
  headBone.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeo.clone(), blushMat);
  rightBlush.position.set(-0.18, -0.06, 0.35);
  headBone.add(rightBlush);

  // Eyebrows (cheerful, warm anime angles)
  const browGeo = new THREE.BoxGeometry(0.12, 0.022, 0.03);
  const leftBrow = new THREE.Mesh(browGeo, hairMat);
  leftBrow.position.set(0.14, 0.17, 0.34);
  leftBrow.rotation.z = 0.04; // subtle cheerful lift
  headBone.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo.clone(), hairMat);
  rightBrow.position.set(-0.14, 0.17, 0.34);
  rightBrow.rotation.z = -0.04;
  headBone.add(rightBrow);

  // Mouth (cheerful upward smile, viseme lip sync, anime happiness)
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.19, 0.36);
  headBone.add(mouthGroup);

  // Clean TorusGeometry without pre-rotation so rotation.z = Math.PI curves UP into a bright radiant smile!
  const mouthBaseGeo = new THREE.TorusGeometry(0.052, 0.012, 8, 20, Math.PI);
  const mouthLine = new THREE.Mesh(mouthBaseGeo, mouthMat);
  mouthLine.rotation.z = Math.PI; // Upward smiling arc ∪
  mouthGroup.add(mouthLine);

  const mouthOpenGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.03, 16);
  mouthOpenGeo.rotateX(Math.PI / 2);
  const mouthInterior = new THREE.Mesh(mouthOpenGeo, mouthMat);
  mouthInterior.position.z = -0.01;
  mouthInterior.scale.set(0.01, 0.01, 0.01);
  mouthGroup.add(mouthInterior);

  // Hair styling according to character personality & gender
  const hairGroup = new THREE.Group();
  headBone.add(hairGroup);

  // Main hair skullcap
  const hairCapGeo = new THREE.SphereGeometry(0.39, 24, 20);
  hairCapGeo.scale(1.02, 1.18, 1.05);
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.05, -0.04);
  hairGroup.add(hairCap);

  // Distinct hairstyle features per character
  if (character.id === 'sunny') {
    // Cheerful twin tails with dynamic bounce
    const tailGeo = new THREE.ConeGeometry(0.14, 0.55, 12);
    const leftTail = new THREE.Mesh(tailGeo, hairMat);
    leftTail.position.set(0.42, 0.05, -0.1);
    leftTail.rotation.set(0.2, 0, -0.5);
    hairGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo.clone(), hairMat);
    rightTail.position.set(-0.42, 0.05, -0.1);
    rightTail.rotation.set(0.2, 0, 0.5);
    hairGroup.add(rightTail);

    // Cute bangs
    const bangGeo = new THREE.ConeGeometry(0.08, 0.28, 8);
    for (let i = -2; i <= 2; i++) {
      const bang = new THREE.Mesh(bangGeo, hairMat);
      bang.position.set(i * 0.09, 0.28, 0.35);
      bang.rotation.set(Math.PI - 0.2, 0, -i * 0.1);
      hairGroup.add(bang);
    }
  } else if (character.id === 'nova') {
    // Cyber bob with illuminated side clips
    const bobGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.45, 16);
    const bob = new THREE.Mesh(bobGeo, hairMat);
    bob.position.set(0, -0.05, -0.05);
    hairGroup.add(bob);

    // Holographic glowing cyber visor / clips
    const visorGeo = new THREE.TorusGeometry(0.37, 0.02, 8, 32, Math.PI * 0.8);
    const visor = new THREE.Mesh(visorGeo, accentMat);
    visor.position.set(0, 0.08, 0.1);
    visor.rotation.x = Math.PI / 2 + 0.1;
    headBone.add(visor);
  } else if (character.id === 'kaito') {
    // Wavy layered creative hair + headband
    const waveGeo = new THREE.TorusGeometry(0.38, 0.06, 8, 24);
    const wave = new THREE.Mesh(waveGeo, hairMat);
    wave.position.set(0, 0.18, 0.05);
    wave.rotation.x = 0.4;
    hairGroup.add(wave);

    const headbandGeo = new THREE.TorusGeometry(0.38, 0.025, 8, 32);
    const headband = new THREE.Mesh(headbandGeo, accentMat);
    headband.position.set(0, 0.12, 0.08);
    headband.rotation.x = Math.PI / 2 - 0.15;
    headBone.add(headband);
  } else {
    // Atlas: Sleek tactical undercut & earpiece
    const sideGeo = new THREE.BoxGeometry(0.12, 0.25, 0.35);
    const leftSide = new THREE.Mesh(sideGeo, hairMat);
    leftSide.position.set(0.35, 0.1, -0.05);
    hairGroup.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo.clone(), hairMat);
    rightSide.position.set(-0.35, 0.1, -0.05);
    hairGroup.add(rightSide);

    // Tactical tactical comms headset
    const earpieceGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    earpieceGeo.rotateZ(Math.PI / 2);
    const earpiece = new THREE.Mesh(earpieceGeo, accentMat);
    earpiece.position.set(0.38, 0.02, 0.05);
    headBone.add(earpiece);
  }

  // Animation state
  let currentEmotion: AvatarEmotion = character.defaultExpression || 'happy';
  let emotionWeight = 1.0;
  let blinkWeight = 0;
  let targetLookAt = new THREE.Vector3(0, 0, 2);
  let currentLookAt = new THREE.Vector3(0, 0, 2);
  let idleTime = 0;

  // Mouth viseme state
  let currentViseme: 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | null = null;
  let visemeWeight = 0;

  return {
    root,
    update: (delta: number) => {
      idleTime += delta;

      // 1. Natural idle breathing & body sway
      torso.position.y = -0.35 + Math.sin(idleTime * 1.8) * 0.012;
      torsoGroup.rotation.z = Math.sin(idleTime * 0.9) * 0.015;

      // 2. Head lookAt interpolation
      currentLookAt.lerp(targetLookAt, Math.min(1, delta * 4.5));
      const lookVector = currentLookAt.clone().sub(headBone.getWorldPosition(new THREE.Vector3()));

      // Clamp head angles to realistic human range (-35 to +35 degrees)
      const targetRotY = THREE.MathUtils.clamp(lookVector.x * 0.35, -0.6, 0.6);
      const targetRotX = THREE.MathUtils.clamp(-lookVector.y * 0.25, -0.4, 0.4);

      headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetRotY, delta * 6);
      headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, targetRotX, delta * 6);

      // Add gentle idle head tilt
      headBone.rotation.z = Math.sin(idleTime * 1.2) * 0.02;

      // 3. Eyelid position (blink)
      // Normal open = 0, closed = 1.0
      const blinkAngle = THREE.MathUtils.lerp(-Math.PI / 2, 0, blinkWeight);
      leftEyelid.rotation.x = blinkAngle;
      rightEyelid.rotation.x = blinkAngle;

      // 4. Emotional expression morphing
      switch (currentEmotion) {
        case 'happy':
          mouthLine.rotation.z = Math.PI; // radiant upward smile ∪
          mouthLine.scale.set(1.25, 1.2, 1);
          leftBrow.position.y = 0.18;
          rightBrow.position.y = 0.18;
          leftBrow.rotation.z = 0.05;
          rightBrow.rotation.z = -0.05;
          leftBlush.scale.set(1.2, 1.2, 1);
          rightBlush.scale.set(1.2, 1.2, 1);
          blushMat.opacity = 0.85;
          break;
        case 'surprised':
          mouthLine.rotation.z = Math.PI;
          mouthLine.scale.set(0.7, 1.6, 1);
          leftBrow.position.y = 0.21;
          rightBrow.position.y = 0.21;
          leftBrow.rotation.z = 0.08;
          rightBrow.rotation.z = -0.08;
          leftBlush.scale.set(0.9, 0.9, 1);
          rightBlush.scale.set(0.9, 0.9, 1);
          blushMat.opacity = 0.6;
          break;
        case 'thinking':
          mouthLine.rotation.z = Math.PI;
          mouthLine.scale.set(0.9, 0.7, 1);
          leftBrow.position.y = 0.18;
          rightBrow.position.y = 0.15; // thoughtful contemplative brow
          leftBrow.rotation.z = 0.03;
          rightBrow.rotation.z = -0.02;
          leftBlush.scale.set(1.0, 1.0, 1);
          rightBlush.scale.set(1.0, 1.0, 1);
          blushMat.opacity = 0.55;
          break;
        case 'sad':
          mouthLine.rotation.z = 0; // downward arc
          mouthLine.scale.set(0.85, 0.7, 1);
          leftBrow.position.y = 0.14;
          rightBrow.position.y = 0.14;
          leftBrow.rotation.z = -0.05;
          rightBrow.rotation.z = 0.05;
          leftBlush.scale.set(0.8, 0.8, 1);
          rightBlush.scale.set(0.8, 0.8, 1);
          blushMat.opacity = 0.4;
          break;
        default:
          mouthLine.rotation.z = Math.PI;
          mouthLine.scale.set(1.15, 1.05, 1);
          leftBrow.position.y = 0.17;
          rightBrow.position.y = 0.17;
          leftBrow.rotation.z = 0.04;
          rightBrow.rotation.z = -0.04;
          leftBlush.scale.set(1.0, 1.0, 1);
          rightBlush.scale.set(1.0, 1.0, 1);
          blushMat.opacity = 0.72;
          break;
      }

      // 5. Viseme lip sync
      if (visemeWeight > 0.01 && currentViseme) {
        let vScaleX = 1;
        let vScaleY = 1;
        if (currentViseme === 'aa') {
          vScaleX = 1.2;
          vScaleY = 2.4;
        } else if (currentViseme === 'ih' || currentViseme === 'ee') {
          vScaleX = 1.6;
          vScaleY = 0.8;
        } else if (currentViseme === 'oh' || currentViseme === 'ou') {
          vScaleX = 0.8;
          vScaleY = 1.8;
        }
        mouthInterior.scale.set(
          THREE.MathUtils.lerp(0.01, vScaleX, visemeWeight),
          THREE.MathUtils.lerp(0.01, vScaleY, visemeWeight),
          THREE.MathUtils.lerp(0.01, 1, visemeWeight)
        );
      } else {
        mouthInterior.scale.set(0.01, 0.01, 0.01);
      }
    },
    setExpression: (emotion: AvatarEmotion, weight: number) => {
      currentEmotion = emotion;
      emotionWeight = weight;
    },
    setBlink: (weight: number) => {
      blinkWeight = THREE.MathUtils.clamp(weight, 0, 1);
    },
    setViseme: (viseme, weight) => {
      currentViseme = viseme;
      visemeWeight = THREE.MathUtils.clamp(weight, 0, 1);
    },
    lookAt: (target: THREE.Vector3) => {
      targetLookAt.copy(target);
    },
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    },
  };
}
