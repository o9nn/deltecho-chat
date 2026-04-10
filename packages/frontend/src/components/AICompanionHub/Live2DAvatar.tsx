/**
 * Live2D Avatar React Component
 *
 * A React wrapper for the Live2D avatar system that integrates
 * with the AI Companion Hub to display an animated avatar.
 *
 * Fixed: StrictMode-safe lifecycle — debounced initialization prevents
 * the double-mount/unmount race that caused immediate renderer disposal.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { ResponsiveSpriteAvatar } from "./ResponsiveSpriteAvatar";

// Local types that are compatible with both @deltecho/avatar and @deltecho/cognitive
export type Expression =
  | "neutral"
  | "happy"
  | "thinking"
  | "curious"
  | "surprised"
  | "concerned"
  | "focused"
  | "playful"
  | "contemplative"
  | "empathetic";

export type AvatarMotion =
  | "idle"
  | "talking"
  | "nodding"
  | "shaking_head"
  | "tilting_head"
  | "tilt_head_left"
  | "tilt_head_right"
  | "breathing"
  | "wave"
  | "nod"
  | "shake"
  | "thinking";

// Flexible emotional vector that accepts any emotion mapping
// Compatible with both @deltecho/cognitive and @deltecho/avatar types
export type EmotionalVector = Record<string, number | string | undefined>;

// Controller interface for external control of the avatar
export interface Live2DAvatarController {
  setExpression: (expression: Expression, intensity?: number) => void;
  playMotion: (motion: AvatarMotion) => void;
  updateLipSync: (audioLevel: number) => void;
  triggerBlink: () => void;
  setParameter: (paramId: string, value: number) => void;
}

// Model paths - local models are served from /models/ in the build output
const CDN_MODELS = {
  miara: "/models/miara/miara_pro_t03.model3.json",
  shizuku:
    "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json",
  haru: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json",
};

export interface Live2DAvatarComponentProps {
  /** Model URL or preset name ('shizuku' | 'haru') */
  model?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Scale factor for the model (0-1) */
  scale?: number;
  /** Current emotional state from cognitive system */
  emotionalState?: EmotionalVector;
  /** Audio level for lip sync (0-1) */
  audioLevel?: number;
  /** Whether the avatar is actively speaking */
  isSpeaking?: boolean;
  /** Callback when model is loaded */
  onLoad?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Additional CSS class name */
  className?: string;
  /** Show loading state */
  showLoading?: boolean;
  /** Show error state */
  showError?: boolean;
  /** Controller ref callback for external control */
  onControllerReady?: (controller: Live2DAvatarController) => void;
  /** Rendering mode */
  mode?: "live2d" | "sprite";
}

export interface Live2DAvatarState {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  currentExpression: Expression;
  retryCount: number;
}

const MAX_RETRIES = 3;

/**
 * Debounce delay to survive React StrictMode double-mount.
 * In dev mode, React mounts → unmounts → remounts within ~50ms.
 * A 100ms debounce ensures we only initialize once after the final mount.
 */
const INIT_DEBOUNCE_MS = 150;

/**
 * Live2D Avatar Component for the AI Companion Hub
 */
export const Live2DAvatar: React.FC<Live2DAvatarComponentProps> = ({
  model = "miara",
  width = 400,
  height = 400,
  scale = 0.25,
  emotionalState,
  audioLevel,
  isSpeaking = false,
  onLoad,
  onError,
  className,
  showLoading = true,
  showError = true,
  onControllerReady,
  mode = "live2d",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<any>(null);
  const controllerRef = useRef<Live2DAvatarController | null>(null);
  // Track whether the current effect instance is still the active one
  const initIdRef = useRef(0);
  const [state, setState] = useState<Live2DAvatarState>({
    isLoading: true,
    isLoaded: false,
    error: null,
    currentExpression: "neutral",
    retryCount: 0,
  });

  // Retry function to re-attempt loading
  const handleRetry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isLoaded: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  // Resolve model URL from preset or use as-is
  const modelUrl = CDN_MODELS[model as keyof typeof CDN_MODELS] || model;

  // Initialize the avatar with debounce to survive StrictMode
  useEffect(() => {
    // Increment the init ID — only the latest init should proceed
    const thisInitId = ++initIdRef.current;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let localManager: any = null;

    const initializeAvatar = async () => {
      if (!containerRef.current) return;
      // Double-check we're still the active init
      if (thisInitId !== initIdRef.current) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Set a timeout to prevent infinite loading state
      timeoutId = setTimeout(() => {
        if (thisInitId === initIdRef.current) {
          setState((prev) => {
            if (prev.isLoading && !prev.isLoaded && !prev.error) {
              return {
                ...prev,
                isLoading: false,
                error: new Error("Avatar loading timed out"),
              };
            }
            return prev;
          });
        }
      }, 15000); // 15 second timeout (increased for slower machines)

      try {
        // Dynamic import to avoid SSR issues
        const { Live2DAvatarManager } = await import("@deltecho/avatar");

        // Check again after async import
        if (thisInitId !== initIdRef.current) return;

        // Create manager instance
        localManager = new Live2DAvatarManager();
        managerRef.current = localManager;

        // Initialize with props
        const controller = await localManager.initialize(
          containerRef.current,
          {
            modelPath: modelUrl,
            width,
            height,
            scale,
            onLoad: () => {
              if (thisInitId === initIdRef.current) {
                if (timeoutId) clearTimeout(timeoutId);
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  isLoaded: true,
                }));
                onLoad?.();
              }
            },
            onError: (error: Error) => {
              if (thisInitId === initIdRef.current) {
                if (timeoutId) clearTimeout(timeoutId);
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  error,
                }));
                onError?.(error);
              }
            },
            debug: false, // Reduce console noise
          },
        );

        // Final check before storing controller
        if (thisInitId !== initIdRef.current) {
          // We were superseded — clean up
          localManager.dispose();
          localManager = null;
          return;
        }

        controllerRef.current = controller;
        onControllerReady?.(controller);
      } catch (error) {
        if (thisInitId === initIdRef.current) {
          if (timeoutId) clearTimeout(timeoutId);
          const err = error instanceof Error ? error : new Error(String(error));
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err,
          }));
          onError?.(err);
        }
      }
    };

    // Debounce the initialization to survive StrictMode double-mount
    debounceTimer = setTimeout(initializeAvatar, INIT_DEBOUNCE_MS);

    return () => {
      // Invalidate this init instance
      // Do NOT increment initIdRef here — the next effect will do that
      // Instead, just mark this one as stale
      const wasActive = thisInitId === initIdRef.current;

      if (debounceTimer) clearTimeout(debounceTimer);
      if (timeoutId) clearTimeout(timeoutId);

      // Only dispose if this was the active manager AND we're truly unmounting
      // (not just a StrictMode re-run)
      if (wasActive && localManager) {
        // Delay disposal slightly to allow StrictMode remount to claim the manager
        setTimeout(() => {
          // If initIdRef has moved on, the new effect took over — don't dispose
          if (thisInitId === initIdRef.current) {
            localManager?.dispose();
            if (managerRef.current === localManager) {
              managerRef.current = null;
            }
            controllerRef.current = null;
          }
        }, INIT_DEBOUNCE_MS + 50);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, state.retryCount]);
  // Note: removed width/height/scale from deps to prevent re-init on resize.
  // The PixiJS app uses resizeTo: canvas.parentElement which handles resize natively.

  // Update emotional state
  useEffect(() => {
    if (!managerRef.current || !state.isLoaded || !emotionalState) return;
    managerRef.current.updateEmotionalState(emotionalState);
  }, [emotionalState, state.isLoaded]);

  // Update lip sync
  useEffect(() => {
    if (!controllerRef.current || !state.isLoaded) return;
    controllerRef.current.updateLipSync(audioLevel ?? 0);
  }, [audioLevel, state.isLoaded]);

  // Sprite-only mode: render sprite without Live2D container
  if (mode === "sprite") {
    return (
      <div
        className={`live2d-avatar-container ${className || ""}`}
        style={{ width, height, position: "relative" }}
      >
        <ResponsiveSpriteAvatar
          emotionalState={emotionalState}
          isSpeaking={isSpeaking}
          width={width}
          height={height}
        />
      </div>
    );
  }

  // Live2D mode: Always render the container so initialization can attach canvas
  // Overlay loading/error states on top of the container
  return (
    <div
      className={`live2d-avatar-container ${className || ""}`}
      style={{ width, height, position: "relative" }}
    >
      {/* Main Live2D canvas container - always rendered for initialization */}
      <div
        ref={containerRef}
        className={`live2d-avatar ${state.isLoaded ? "live2d-ready" : ""}`}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          // Transparent background — let the chat view show through
          background: "transparent",
          // Always visible so the canvas can initialize with real dimensions
          visibility: state.isLoaded && !state.error ? "visible" : "hidden",
          // Ensure the canvas is above the chat but below UI controls
          zIndex: 10,
          // Pointer events pass through when not loaded
          pointerEvents: state.isLoaded ? "auto" : "none",
        }}
        data-width={width}
        data-height={height}
      />

      {/* Loading state overlay */}
      {showLoading && state.isLoading && !state.error && (
        <div
          className="live2d-loading"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 11,
          }}
        >
          <div className="live2d-loading-content">
            <div className="live2d-spinner" />
            <span>Loading Avatar...</span>
          </div>
        </div>
      )}

      {/* Error state: show sprite fallback with error indicator and retry button */}
      {showError && state.error && (
        <>
          <ResponsiveSpriteAvatar
            emotionalState={emotionalState}
            isSpeaking={isSpeaking}
            width={width}
            height={height}
          />
          <div
            className="live2d-error-overlay"
            style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "rgba(0,0,0,0.7)",
              padding: "6px 12px",
              borderRadius: 6,
              color: "#fff",
              fontSize: 12,
              zIndex: 12,
            }}
          >
            <span title={state.error.message}>Live2D Failed</span>
            {state.retryCount < MAX_RETRIES && (
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  background: "#4a90d9",
                  border: "none",
                  borderRadius: 4,
                  color: "#fff",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                }}
              >
                Retry ({MAX_RETRIES - state.retryCount} left)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Hook for controlling a Live2D avatar from outside the component
 */
export function useLive2DController() {
  const controllerRef = useRef<Live2DAvatarController | null>(null);

  const setController = useCallback((controller: Live2DAvatarController) => {
    controllerRef.current = controller;
  }, []);

  const setExpression = useCallback(
    (expression: Expression, intensity?: number) => {
      controllerRef.current?.setExpression(expression, intensity);
    },
    [],
  );

  const playMotion = useCallback((motion: AvatarMotion) => {
    controllerRef.current?.playMotion(motion);
  }, []);

  const updateLipSync = useCallback((level: number) => {
    controllerRef.current?.updateLipSync(level);
  }, []);

  const triggerBlink = useCallback(() => {
    controllerRef.current?.triggerBlink();
  }, []);

  const setParameter = useCallback((paramId: string, value: number) => {
    controllerRef.current?.setParameter(paramId, value);
  }, []);

  return {
    setController,
    setExpression,
    playMotion,
    updateLipSync,
    triggerBlink,
    setParameter,
    controller: controllerRef.current,
  };
}

export default Live2DAvatar;
