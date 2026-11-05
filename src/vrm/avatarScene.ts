import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { CharacterProfile } from '../types/character.js';
import { AvatarEmotion } from '../types/chat.js';
import { createProceduralAvatar, AvatarController } from './proceduralAvatar.js';

export interface SceneController {
  loadCharacter: (character: CharacterProfile) => Promise<void>;
  loadCustomVrm: (arrayBuffer: ArrayBuffer) => Promise<void>;
  setEmotion: (emotion: AvatarEmotion) => void;
  setLipSyncActive: (active: boolean) => void;
  updateCursor: (normalizedX: number, normalizedY: number) => void;
  triggerBounce?: () => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
}

export function initAvatarScene(
  container: HTMLDivElement,
  initialCharacter: CharacterProfile
): SceneController {
  const scene = new THREE.Scene();

  const width = container.clientWidth || 360;
  const height = container.clientHeight || 480;

  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 20);
  camera.position.set(0, 0.15, 2.4);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.0);
  keyLight.position.set(1.5, 2.5, 2.5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd9e8ff, 1.2);
  fillLight.position.set(-2, 0.5, 1.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(new THREE.Color(initialCharacter.glowColor), 2.2);
  rimLight.position.set(0, 2, -2.5);
  scene.add(rimLight);

  // Character state
  let currentProcedural: AvatarController | null = null;
  let currentVrm: VRM | null = null;
  let activeEmotion: AvatarEmotion = initialCharacter.defaultExpression || 'happy';
  let isSpeaking = false;
  let lipSyncTime = 0;

  // Blinking cycle state
  let nextBlinkTime = 2.0 + Math.random() * 2.5;
  let blinkTimer = 0;
  let isBlinking = false;
  let blinkProgress = 0;

  // Cursor tracking coordinates
  const targetLook = new THREE.Vector3(0, 0, 2);

  // Companion reaction bounce physics
  let bounceVelocity = 0;
  let bounceOffsetY = 0;

  function clearActiveModel() {
    if (currentProcedural) {
      scene.remove(currentProcedural.root);
      currentProcedural.dispose();
      currentProcedural = null;
    }
    if (currentVrm) {
      scene.remove(currentVrm.scene);
      currentVrm.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
      currentVrm = null;
    }
  }

  function setupProcedural(character: CharacterProfile) {
    clearActiveModel();
    rimLight.color.set(character.glowColor);
    const avatar = createProceduralAvatar(character);
    currentProcedural = avatar;
    scene.add(avatar.root);
    avatar.setExpression(activeEmotion, 1.0);
  }

  // Load initial character
  setupProcedural(initialCharacter);

  // Animation Loop
  let animationFrameId: number;
  let lastTime = performance.now();

  function animate(now: number) {
    animationFrameId = requestAnimationFrame(animate);

    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 0. Companion reaction bounce physics
    if (bounceOffsetY > 0 || Math.abs(bounceVelocity) > 0.01) {
      bounceVelocity -= 8.0 * delta;
      bounceOffsetY += bounceVelocity * delta;
      if (bounceOffsetY <= 0) {
        bounceOffsetY = 0;
        bounceVelocity = 0;
      }
    }

    // 1. Natural Blink cycle
    blinkTimer += delta;
    if (!isBlinking && blinkTimer >= nextBlinkTime) {
      isBlinking = true;
      blinkProgress = 0;
    }

    let blinkVal = 0;
    if (isBlinking) {
      blinkProgress += delta * 7.5; // ~130ms blink duration
      if (blinkProgress <= 0.5) {
        blinkVal = blinkProgress * 2;
      } else if (blinkProgress <= 1.0) {
        blinkVal = (1.0 - blinkProgress) * 2;
      } else {
        isBlinking = false;
        blinkTimer = 0;
        nextBlinkTime = 2.5 + Math.random() * 3.5;
        blinkVal = 0;
      }
    }

    // 2. Lip sync viseme oscillation
    let visemeVal = 0;
    let activeViseme: 'aa' | 'ih' | 'oh' = 'aa';
    if (isSpeaking) {
      lipSyncTime += delta * 12;
      visemeVal = Math.max(0, Math.sin(lipSyncTime) * 0.9 + 0.1);
      const mod = Math.floor(lipSyncTime / Math.PI) % 3;
      if (mod === 0) activeViseme = 'aa';
      else if (mod === 1) activeViseme = 'ih';
      else activeViseme = 'oh';
    }

    // 3. Update procedural avatar
    if (currentProcedural) {
      currentProcedural.root.position.y = bounceOffsetY;
      currentProcedural.setBlink(blinkVal);
      currentProcedural.lookAt(targetLook);
      currentProcedural.setViseme(activeViseme, visemeVal);
      currentProcedural.update(delta);
    }

    // 4. Update VRM avatar if active
    if (currentVrm) {
      currentVrm.scene.position.y = -1.2 + bounceOffsetY;
      currentVrm.update(delta);

      // LookAt
      if (currentVrm.lookAt) {
        currentVrm.lookAt.lookAt(targetLook);
      }

      // Expressions
      if (currentVrm.expressionManager) {
        // Blink
        currentVrm.expressionManager.setValue(VRMExpressionPresetName.Blink, blinkVal);

        // Emotions
        const happyVal = activeEmotion === 'happy' ? 1.0 : 0;
        const sadVal = activeEmotion === 'sad' ? 1.0 : 0;
        const surprisedVal = activeEmotion === 'surprised' ? 1.0 : 0;
        const relaxedVal = activeEmotion === 'relaxed' ? 1.0 : 0;

        currentVrm.expressionManager.setValue(VRMExpressionPresetName.Happy, happyVal);
        currentVrm.expressionManager.setValue(VRMExpressionPresetName.Sad, sadVal);
        currentVrm.expressionManager.setValue(VRMExpressionPresetName.Surprised, surprisedVal);
        currentVrm.expressionManager.setValue(VRMExpressionPresetName.Relaxed, relaxedVal);

        // Viseme lip-sync
        if (isSpeaking) {
          currentVrm.expressionManager.setValue(VRMExpressionPresetName.Aa, activeViseme === 'aa' ? visemeVal : 0);
          currentVrm.expressionManager.setValue(VRMExpressionPresetName.Ih, activeViseme === 'ih' ? visemeVal : 0);
          currentVrm.expressionManager.setValue(VRMExpressionPresetName.Oh, activeViseme === 'oh' ? visemeVal : 0);
        } else {
          currentVrm.expressionManager.setValue(VRMExpressionPresetName.Aa, 0);
          currentVrm.expressionManager.setValue(VRMExpressionPresetName.Ih, 0);
          currentVrm.expressionManager.setValue(VRMExpressionPresetName.Oh, 0);
        }

        currentVrm.expressionManager.update();
      }
    }

    renderer.render(scene, camera);
  }

  animationFrameId = requestAnimationFrame(animate);

  return {
    loadCharacter: async (character: CharacterProfile) => {
      activeEmotion = character.defaultExpression || 'happy';
      rimLight.color.set(character.glowColor);
      setupProcedural(character);
    },
    loadCustomVrm: async (arrayBuffer: ArrayBuffer) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.parseAsync(arrayBuffer, '');
      const vrm = gltf.userData.vrm as VRM;
      if (!vrm) {
        throw new Error('File does not contain valid VRM data');
      }

      clearActiveModel();
      currentVrm = vrm;
      scene.add(vrm.scene);

      // Frame camera to VRM head
      vrm.scene.rotation.y = Math.PI; // Face forward
      vrm.scene.position.set(0, -1.2, 0); // Position bust in viewport
    },
    setEmotion: (emotion: AvatarEmotion) => {
      activeEmotion = emotion;
      if (currentProcedural) {
        currentProcedural.setExpression(emotion, 1.0);
      }
    },
    setLipSyncActive: (active: boolean) => {
      isSpeaking = active;
      if (!active) {
        lipSyncTime = 0;
      }
    },
    triggerBounce: () => {
      bounceVelocity = 0.55;
    },
    updateCursor: (nx: number, ny: number) => {
      // Map screen [-1, 1] to 3D world target
      targetLook.set(nx * 1.8, ny * 1.2 + 0.15, 2.2);
    },
    resize: (newW: number, newH: number) => {
      if (!newW || !newH) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    },
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      clearActiveModel();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}
