/**
 * Live2D Avatar React Component
 *
 * A React wrapper for the Live2D avatar system that integrates
 * with the AI Companion Hub to display an animated avatar.
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { MiaraOutfitState } from "@deltecho/avatar";
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

export interface MetabolicVisualState {
  metabolicPhase: "active" | "integrating" | "consolidating" | "resting";
  energyLevel: number;
  anabolicBalance: number;
  isEnergyCrisis: boolean;
  myelinationProgress: number;
  knowledgeDensity: number;
}

export interface CognitiveVisualState {
  mode?: string;
  currentState?: string;
  valence?: number;
  arousal?: number;
  selfAwareness?: number;
  sentience?: number;
  phi?: number;
  flow?: number;
  temporalCoherence?: number;
  salience?: number;
  /** Normalized ScientificGeniusEngine / entelechy activation projected into Live2D. */
  scientificGenius?: number;
  /** Emergent insight potential from the scientific-genius / entelechy loop. */
  insightPotential?: number;
  /** Self-realization score from the entelechy emergence pathway. */
  entelechyScore?: number;
  /** Free-energy pressure; high values sharpen vigilance until insight resolves it. */
  freeEnergy?: number;
  /** DAO-like consensus confidence for special AGI self-governance. */
  daoConsensus?: number;
  /** Echo State Network reservoir coherence from the Autognosis loop. */
  esnCoherence?: number;
  /** Self-observation intensity for luminous inference resonance. */
  autognosisResonance?: number;
  /** Confidence-weighted rendered-avatar self-model telemetry. */
  embodimentAccuracy?: number;
  embodimentError?: number;
  embodimentConfidence?: number;
  causalRigor?: number;
  falsificationPressure?: number;
  epistemicSurprise?: number;
  daoEvidenceConsensus?: number;
  activeExperimentation?: number;
  /** ConceptualMetabolism state used for embodied energy and phase rendering. */
  metabolic?: MetabolicVisualState;
  isProcessing?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
}

// Controller interface for external control of the avatar
export interface Live2DAvatarController {
  setExpression: (expression: Expression, intensity?: number) => void;
  setNamedExpression?: (name: string) => boolean;
  playMotion: (motion: AvatarMotion) => void;
  updateLipSync: (audioLevel: number) => void;
  updateCognitiveState?: (state: CognitiveVisualState) => void;
  triggerBlink: () => void;
  setParameter: (paramId: string, value: number) => void;
  applyOutfit?: (outfit: Partial<MiaraOutfitState> | null | undefined) => void;
  inspectMesh?: () => import("@deltecho/avatar").AutomeshDrawable[];
  applyTextureOverlay?: (source: string) => Promise<boolean>;
  clearTextureOverlay?: () => Promise<boolean>;
  applyParameterProfile?: (profile: Record<string, number> | null) => void;
  applyIdentityRig?: (
    rig: import("@deltecho/avatar").IdentityRig | null,
  ) => void;
  getNativeSize?: () => { width: number; height: number } | null;
}

const LOCAL_MIARA_MODEL = "models/miara/miara_pro_t03.model3.json";
const LOCAL_GROVE_MODEL =
  "models/deep-tree-echo/deep-tree-echo_t03.model3.json";
const LOCAL_MELODY_MODEL = "models/melody/melody_t03.model3.json";

// Model paths - local models are served next to main.html in the build output.
// Electron loads that page as file://, so a leading slash would resolve to
// file:///models/... and never find the assets.
const CDN_MODELS = {
  miara: LOCAL_MIARA_MODEL,
  "deep-tree-echo": LOCAL_GROVE_MODEL,
  melody: LOCAL_MELODY_MODEL,
  shizuku:
    "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json",
  haru: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json",
};

export function resolveLive2DModelUrl(model: string): string {
  const mapped = CDN_MODELS[model as keyof typeof CDN_MODELS] || model;
  if (!mapped.startsWith("http") && typeof window !== "undefined") {
    return new URL(mapped, window.location.href).href;
  }
  return mapped;
}

export interface Live2DAvatarComponentProps {
  /** Model URL or preset name ('shizuku' | 'haru') */
  model?: string;
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** How much of the view the full figure should occupy (0-1, contain-fit) */
  scale?: number;
  /** Optional Live2D render pixel-ratio override; omit to use the renderer's capped default. */
  pixelRatio?: number;
  /** Current emotional state from cognitive system */
  emotionalState?: EmotionalVector;
  /** Richer DTEcho visual projection state for Cubism micro-expressions */
  cognitiveVisualState?: CognitiveVisualState;
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
  /** Fill a rectangular parent instead of a circular card */
  fillContainer?: boolean;
  /** Miara wardrobe to apply after the model loads */
  outfit?: Partial<MiaraOutfitState> | null;
  /**
   * Lock a Cubism expression by name. When set, cognitive and emotional
   * updates do not overwrite the face.
   */
  manualExpression?: string;
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
 * Live2D Avatar Component for the AI Companion Hub
 */
export const Live2DAvatar: React.FC<Live2DAvatarComponentProps> = ({
  model = "miara",
  width = 400,
  height = 400,
  scale = 0.9,
  pixelRatio,
  emotionalState,
  cognitiveVisualState,
  audioLevel,
  isSpeaking = false,
  onLoad,
  onError,
  className,
  showLoading = true,
  showError = true,
  onControllerReady,
  mode = "live2d",
  fillContainer = false,
  outfit,
  manualExpression,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<any>(null);
  const controllerRef = useRef<Live2DAvatarController | null>(null);
  const lastLipSyncLevelRef = useRef<number | null>(null);
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
  const modelUrl = resolveLive2DModelUrl(model);

  // Initialize the avatar
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initializeAvatar = async () => {
      if (!containerRef.current) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Set a timeout to prevent infinite loading state.
      // 30s accounts for slow networks pulling moc3 (~500 KB) + 4096x4096 texture + JSON files.
      timeoutId = setTimeout(() => {
        if (mounted) {
          setState((prev) => {
            // Only set error if still loading (not already loaded or errored)
            if (prev.isLoading && !prev.isLoaded && !prev.error) {
              // eslint-disable-next-line no-console
              console.error(
                "[Live2DAvatar] Loading timed out after 30s. Model URL:",
                modelUrl,
              );
              return {
                ...prev,
                isLoading: false,
                error: new Error("Avatar loading timed out"),
              };
            }
            return prev;
          });
        }
      }, 30000); // 30 second timeout

      try {
        // Dynamic import to avoid SSR issues
        const { Live2DAvatarManager } = await import("@deltecho/avatar");

        // Create manager instance
        managerRef.current = new Live2DAvatarManager();

        // Initialize with props
        const controller = await managerRef.current.initialize(
          containerRef.current,
          {
            modelPath: modelUrl,
            width,
            height,
            scale,
            pixelRatio,
            onLoad: () => {
              if (mounted) {
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
              if (mounted) {
                if (timeoutId) clearTimeout(timeoutId);
                // eslint-disable-next-line no-console
                console.error(
                  "[Live2DAvatar] Manager.onError for model",
                  modelUrl,
                  ":",
                  error?.message || error,
                  error,
                );
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  error,
                }));
                onError?.(error);
              }
            },
            debug: process.env.NODE_ENV === "development",
          },
        );

        controllerRef.current = controller;
        if (manualExpression && controller.setNamedExpression) {
          controller.setNamedExpression(manualExpression);
        }
        onControllerReady?.(controller);
      } catch (error) {
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          const err = error instanceof Error ? error : new Error(String(error));
          // eslint-disable-next-line no-console
          console.error(
            "[Live2DAvatar] Initialization error for model",
            modelUrl,
            ":",
            err,
          );
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err,
          }));
          onError?.(err);
        }
      }
    };

    initializeAvatar();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      managerRef.current?.dispose();
      managerRef.current = null;
      controllerRef.current = null;
      lastLipSyncLevelRef.current = null;
    };
    // Size/scale changes must not rebuild the WebGL context — Cubism textures
    // from a torn-down Pixi app fail with "object does not belong to this context".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, pixelRatio, state.retryCount]);

  useEffect(() => {
    if (!state.isLoaded) return;
    if (fillContainer) {
      const element = containerRef.current;
      if (element && element.clientWidth > 0 && element.clientHeight > 0) {
        managerRef.current?.resize(
          element.clientWidth,
          element.clientHeight,
          scale,
        );
        return;
      }
    }
    managerRef.current?.resize(width, height, scale);
  }, [width, height, scale, state.isLoaded, fillContainer]);

  useEffect(() => {
    if (!fillContainer || !state.isLoaded) return undefined;
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const apply = () => {
      const nextWidth = Math.round(element.clientWidth);
      const nextHeight = Math.round(element.clientHeight);
      if (nextWidth <= 0 || nextHeight <= 0) return;
      managerRef.current?.resize(nextWidth, nextHeight, scale);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fillContainer, state.isLoaded, scale]);

  // Lock a named Cubism face so live cognitive polling cannot overwrite it.
  useEffect(() => {
    if (!state.isLoaded || !manualExpression) return;
    controllerRef.current?.setNamedExpression?.(manualExpression);
  }, [manualExpression, state.isLoaded]);

  // Update emotional state
  useEffect(() => {
    if (manualExpression) return;
    if (!managerRef.current || !state.isLoaded || !emotionalState) return;
    managerRef.current.updateEmotionalState(emotionalState);
  }, [emotionalState, state.isLoaded, manualExpression]);

  // Update richer DTEcho cognitive visual state
  useEffect(() => {
    if (manualExpression) return;
    if (!managerRef.current || !state.isLoaded || !cognitiveVisualState) return;
    managerRef.current.updateCognitiveState(cognitiveVisualState);
  }, [cognitiveVisualState, state.isLoaded, manualExpression]);

  // Update lip sync. Use a small deadband so high-frequency audio-level
  // sampling does not force redundant parameter writes into the Live2D core.
  useEffect(() => {
    if (!controllerRef.current || !state.isLoaded) return;
    const nextLevel = isSpeaking ? audioLevel ?? 0 : 0;
    const previousLevel = lastLipSyncLevelRef.current;
    if (previousLevel !== null && Math.abs(previousLevel - nextLevel) < 0.01) {
      return;
    }
    lastLipSyncLevelRef.current = nextLevel;
    controllerRef.current.updateLipSync(nextLevel);
  }, [audioLevel, isSpeaking, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded || !outfit) return;
    controllerRef.current?.applyOutfit?.(outfit);
  }, [outfit, state.isLoaded]);

  // Sprite-only mode: render sprite without Live2D container
  if (mode === "sprite") {
    return (
      <div
        className={`live2d-avatar-container ${className || ""}`}
        style={
          fillContainer
            ? { width: "100%", height: "100%", position: "relative" }
            : { width, height, position: "relative" }
        }
      >
        <ResponsiveSpriteAvatar
          emotionalState={emotionalState}
          isSpeaking={isSpeaking}
          width={width}
          height={height}
          rounded={!fillContainer}
        />
      </div>
    );
  }

  // Live2D mode: Always render the container so initialization can attach canvas
  // Overlay loading/error states on top of the container
  return (
    <div
      className={`live2d-avatar-container ${className || ""}`}
      style={
        fillContainer
          ? { width: "100%", height: "100%", position: "relative" }
          : { width, height, position: "relative" }
      }
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
          visibility: state.isLoaded && !state.error ? "visible" : "hidden",
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
            rounded={!fillContainer}
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
            }}
          >
            <span title={state.error.message}>⚠️ Live2D Failed</span>
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

  const updateCognitiveState = useCallback((state: CognitiveVisualState) => {
    controllerRef.current?.updateCognitiveState?.(state);
  }, []);

  const setParameter = useCallback((paramId: string, value: number) => {
    controllerRef.current?.setParameter(paramId, value);
  }, []);

  return {
    setController,
    setExpression,
    playMotion,
    updateLipSync,
    updateCognitiveState,
    triggerBlink,
    setParameter,
    controller: controllerRef.current,
  };
}

export default Live2DAvatar;
