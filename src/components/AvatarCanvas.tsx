import React, { useEffect, useRef } from 'react';
import { CharacterProfile } from '../types/character.js';
import { AvatarEmotion } from '../types/chat.js';
import { initAvatarScene, SceneController } from '../vrm/avatarScene.js';

interface AvatarCanvasProps {
  character: CharacterProfile;
  emotion: AvatarEmotion;
  isSpeaking: boolean;
  onSceneReady?: (controller: SceneController) => void;
  onAvatarClick?: () => void;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  character,
  emotion,
  isSpeaking,
  onSceneReady,
  onAvatarClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);

  // Mount Three.js canvas once
  useEffect(() => {
    if (!containerRef.current) return;

    const controller = initAvatarScene(containerRef.current, character);
    sceneControllerRef.current = controller;
    onSceneReady?.(controller);

    // Track mouse movement across the window for head lookAt
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      controller.updateCursor(nx, ny);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        controller.resize(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      controller.destroy();
      sceneControllerRef.current = null;
    };
  }, []);

  // Update character when profile changes
  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.loadCharacter(character);
    }
  }, [character.id]);

  // Update facial emotion
  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setEmotion(emotion);
    }
  }, [emotion]);

  // Update lip sync state
  useEffect(() => {
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setLipSyncActive(isSpeaking);
    }
  }, [isSpeaking]);

  return (
    <div
      ref={containerRef}
      onClick={onAvatarClick}
      title={`Click to cheer or interact with ${character.name}!`}
      className="w-full h-full relative overflow-hidden select-none cursor-pointer"
      style={{ touchAction: 'none' }}
    />
  );
};
