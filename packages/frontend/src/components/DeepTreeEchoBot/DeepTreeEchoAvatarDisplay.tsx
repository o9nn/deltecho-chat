/**
 * DeepTreeEchoAvatarDisplay - Live2D Avatar Integration with Deep Tree Echo Bot
 *
 * This component displays an animated Live2D avatar that responds to the
 * cognitive and emotional state of the Deep Tree Echo AI companion.
 */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  LIVE_AVATAR_EXPRESSION,
  isMiaraCubismExpressionName,
  resolveAvatarExpression,
  applyIdentityLook,
  mergeIdentityHiddenGroups,
  resolveMiaraOutfit,
} from "@deltecho/avatar";
import { Live2DAvatar } from "../AICompanionHub/Live2DAvatar";
import type {
  Live2DAvatarController,
  Expression,
  AvatarMotion,
  EmotionalVector,
  CognitiveVisualState,
} from "../AICompanionHub/Live2DAvatar";
import { AvatarIdentityPicker } from "./AvatarIdentityPicker";
import { MiaraExpressionPicker } from "./MiaraExpressionPicker";
import { MiaraOutfitPicker } from "./MiaraOutfitPicker";
import { getOrchestrator } from "./CognitiveBridge";
import type { UnifiedCognitiveState } from "./CognitiveBridge";
import {
  useDeepTreeEchoAvatarOptional,
  AvatarProcessingState as BotProcessingState,
} from "./DeepTreeEchoAvatarContext";
// Styles are in scss/components/_deep-tree-echo-avatar.scss

const AVATAR_STATE_POLL_MS = 500;
const AVATAR_STATE_DEADBAND = 0.01;

function roundAvatarSignal(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function getCognitiveStateSignature(
  cognitiveState: UnifiedCognitiveState | null,
): string {
  if (!cognitiveState?.cognitiveContext) return "no-context";

  const { cognitiveContext, persona, reasoning } = cognitiveState;
  return [
    roundAvatarSignal(cognitiveContext.emotionalValence),
    roundAvatarSignal(cognitiveContext.emotionalArousal),
    roundAvatarSignal(cognitiveContext.salienceScore),
    roundAvatarSignal(cognitiveContext.attentionWeight),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.scientificGenius,
    ),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.entelechyScore,
    ),
    roundAvatarSignal(cognitiveState.scientificGeniusVisualState?.freeEnergy),
    roundAvatarSignal(cognitiveState.scientificGeniusVisualState?.daoConsensus),
    roundAvatarSignal(cognitiveState.scientificGeniusVisualState?.esnCoherence),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.autognosisResonance,
    ),
    roundAvatarSignal(cognitiveState.scientificGeniusVisualState?.causalRigor),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.falsificationPressure,
    ),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.epistemicSurprise,
    ),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.daoEvidenceConsensus,
    ),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.activeExperimentation,
    ),
    cognitiveState.scientificGeniusVisualState?.metabolic?.metabolicPhase ??
      "no-metabolic-phase",
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.metabolic?.energyLevel,
    ),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.metabolic?.anabolicBalance,
    ),
    cognitiveState.scientificGeniusVisualState?.metabolic?.isEnergyCrisis ??
      false,
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.metabolic
        ?.myelinationProgress,
    ),
    roundAvatarSignal(
      cognitiveState.scientificGeniusVisualState?.metabolic?.knowledgeDensity,
    ),
    cognitiveState.scientificGeniusVisualState?.mode ?? "no-genius-mode",
    persona?.currentMood ?? "unknown-mood",
    roundAvatarSignal(reasoning?.confidenceLevel),
    reasoning?.activeGoals?.length ?? 0,
    reasoning?.attentionFocus?.length ?? 0,
  ].join("|");
}

function emotionalVectorsEqual(
  left: EmotionalVector,
  right: EmotionalVector,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const leftValue = left[key];
    const rightValue = right[key];
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      if (Math.abs(leftValue - rightValue) > AVATAR_STATE_DEADBAND) {
        return false;
      }
    } else if (leftValue !== rightValue) {
      return false;
    }
  }
  return true;
}

function cognitiveVisualStatesEqual(
  left: CognitiveVisualState,
  right: CognitiveVisualState,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const leftValue = left[key as keyof CognitiveVisualState];
    const rightValue = right[key as keyof CognitiveVisualState];
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      if (Math.abs(leftValue - rightValue) > AVATAR_STATE_DEADBAND) {
        return false;
      }
    } else if (leftValue !== rightValue) {
      return false;
    }
  }
  return true;
}

export interface DeepTreeEchoAvatarDisplayProps {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Whether the avatar is visible */
  visible?: boolean;
  /** Current bot processing state */
  processingState?: BotProcessingState;
  /** Whether the bot is currently speaking */
  isSpeaking?: boolean;
  /** Audio level for lip sync (0-1) */
  audioLevel?: number;
  /** Custom CSS class */
  className?: string;
  /** Position mode */
  position?: "inline" | "floating";
  /** Callback when avatar is ready */
  onReady?: () => void;
  /** Native visual size after the Cubism model loads */
  onNativeSize?: (size: { width: number; height: number }) => void;
}

/**
 * Maps cognitive/emotional state to a Live2D expression
 */
function mapCognitiveStateToExpression(
  cognitiveState: UnifiedCognitiveState | null,
  processingState?: BotProcessingState,
): Expression {
  // First check processing state
  if (processingState === BotProcessingState.THINKING) {
    return "thinking";
  }
  if (processingState === BotProcessingState.ERROR) {
    return "concerned";
  }
  if (processingState === BotProcessingState.RESPONDING) {
    return "focused";
  }

  // Then check cognitive emotional state
  if (!cognitiveState?.cognitiveContext) {
    return "neutral";
  }

  const { emotionalValence, emotionalArousal } =
    cognitiveState.cognitiveContext;

  // High valence (positive) emotions
  if (emotionalValence > 0.5) {
    if (emotionalArousal > 0.7) {
      return "surprised"; // Excited/amazed
    } else if (emotionalArousal > 0.4) {
      return "playful"; // Playful/engaged
    } else {
      return "happy"; // Content/pleased
    }
  }

  // Low valence (negative) emotions
  if (emotionalValence < -0.5) {
    if (emotionalArousal > 0.5) {
      return "concerned"; // Worried/anxious
    } else {
      return "contemplative"; // Sad/reflective
    }
  }

  // Neutral valence with high arousal
  if (emotionalArousal > 0.6) {
    return "curious"; // Alert/attentive
  }

  // Default neutral
  return "neutral";
}

/**
 * Maps cognitive state to an emotional vector for the avatar
 */
function mapCognitiveStateToEmotionalVector(
  cognitiveState: UnifiedCognitiveState | null,
): EmotionalVector {
  if (!cognitiveState?.cognitiveContext) {
    return { neutral: 1.0 };
  }

  const { emotionalValence, emotionalArousal, salienceScore } =
    cognitiveState.cognitiveContext;

  // Convert cognitive emotional state to avatar emotional vector
  const emotional: EmotionalVector = {};

  // Map valence to positive/negative emotions
  if (emotionalValence > 0) {
    emotional.joy = emotionalValence;
    emotional.curiosity = emotionalArousal * 0.7;
  } else if (emotionalValence < 0) {
    emotional.concern = Math.abs(emotionalValence);
    emotional.focus = emotionalArousal * 0.5;
  }

  // Map arousal
  if (emotionalArousal > 0.5) {
    emotional.excitement = emotionalArousal;
  } else {
    emotional.calm = 1 - emotionalArousal;
  }

  // Map salience to attention
  emotional.attention = salienceScore;

  return emotional;
}

function mapProcessingStateToDTEchoMode(
  processingState: BotProcessingState,
  cognitiveState: UnifiedCognitiveState | null,
): string {
  const geniusSignal = cognitiveState?.scientificGeniusVisualState;
  if (
    geniusSignal?.mode === "Scientific Genius" &&
    geniusSignal.scientificGenius >= 0.72
  ) {
    return "Scientific Genius";
  }

  if (processingState === BotProcessingState.RESPONDING) return "Speaking";
  if (processingState === BotProcessingState.THINKING)
    return "Recursive Expansion";
  if (processingState === BotProcessingState.LISTENING) {
    return "External Validation Triggered";
  }
  if (processingState === BotProcessingState.ERROR) return "Entropy Threshold";

  const mood = cognitiveState?.persona?.currentMood?.toLowerCase() ?? "";
  if (mood.includes("curious")) return "Recursive Expansion";
  if (mood.includes("focused")) return "Knowledge Integration";
  if (mood.includes("playful")) return "Pattern Recognition";
  if (mood.includes("contemplative")) return "Self-Reference Point";
  return "Idle";
}

function mapCognitiveStateToVisualState(
  cognitiveState: UnifiedCognitiveState | null,
  processingState: BotProcessingState,
  isSpeaking: boolean,
  audioLevel: number,
): CognitiveVisualState {
  const context = cognitiveState?.cognitiveContext;
  const consciousness = cognitiveState?.consciousness as
    | {
        phi?: number;
        selfAwareness?: number;
        flowState?: number;
        temporalCoherence?: number;
      }
    | undefined;

  const valence = context?.emotionalValence ?? 0;
  const arousal =
    context?.emotionalArousal ??
    (processingState === BotProcessingState.IDLE ? 0.25 : 0.58);
  const salience = context?.salienceScore ?? context?.attentionWeight ?? 0.45;
  const geniusSignal = cognitiveState?.scientificGeniusVisualState;
  const mode = mapProcessingStateToDTEchoMode(processingState, cognitiveState);

  return {
    mode,
    currentState: mode,
    valence,
    arousal,
    selfAwareness:
      consciousness?.selfAwareness ?? Math.max(0.35, salience * 0.7),
    sentience: consciousness?.phi ?? Math.max(0.35, salience * 0.65),
    phi: consciousness?.phi ?? salience * 0.65,
    flow:
      consciousness?.flowState ??
      (processingState === BotProcessingState.THINKING ||
      processingState === BotProcessingState.RESPONDING
        ? Math.max(0.55, salience)
        : Math.max(0.25, salience * 0.55)),
    temporalCoherence: consciousness?.temporalCoherence ?? 0.6,
    salience: geniusSignal?.salience ?? salience,
    scientificGenius: geniusSignal?.scientificGenius ?? 0,
    insightPotential: geniusSignal?.insightPotential ?? 0,
    entelechyScore: geniusSignal?.entelechyScore ?? 0,
    freeEnergy: geniusSignal?.freeEnergy ?? 0,
    daoConsensus:
      geniusSignal?.daoConsensus ??
      (consciousness?.phi ?? salience * 0.65) * 0.55 +
        (consciousness?.temporalCoherence ?? 0.6) * 0.45,
    esnCoherence:
      geniusSignal?.esnCoherence ??
      geniusSignal?.flow ??
      consciousness?.flowState ??
      (processingState === BotProcessingState.THINKING
        ? 0.72
        : salience * 0.55),
    autognosisResonance:
      geniusSignal?.autognosisResonance ??
      geniusSignal?.selfAwareness ??
      consciousness?.selfAwareness ??
      Math.max(0.35, salience * 0.7),
    causalRigor: geniusSignal?.causalRigor ?? 0,
    falsificationPressure:
      geniusSignal?.falsificationPressure ?? geniusSignal?.freeEnergy ?? 0,
    epistemicSurprise: geniusSignal?.epistemicSurprise ?? 0,
    daoEvidenceConsensus:
      geniusSignal?.daoEvidenceConsensus ?? geniusSignal?.daoConsensus ?? 0,
    activeExperimentation: geniusSignal?.activeExperimentation ?? 0,
    metabolic: geniusSignal?.metabolic,
    isProcessing:
      processingState === BotProcessingState.THINKING ||
      processingState === BotProcessingState.RESPONDING,
    isSpeaking,
    audioLevel,
  };
}

/**
 * Main Avatar Display Component
 */
export const DeepTreeEchoAvatarDisplay: React.FC<
  DeepTreeEchoAvatarDisplayProps
> = ({
  width,
  height,
  visible,
  processingState: propsProcessingState,
  isSpeaking: propsIsSpeaking,
  audioLevel: propsAudioLevel,
  className = "",
  position,
  onReady,
  onNativeSize,
}) => {
  const avatarContext = useDeepTreeEchoAvatarOptional();
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripSize, setStripSize] = useState({ width: 0, height: 0 });

  // Use context values if available, otherwise use props
  const configuredWidth = width ?? avatarContext?.state.config.width ?? 300;
  const configuredHeight = height ?? avatarContext?.state.config.height ?? 300;
  const finalVisible = visible ?? avatarContext?.state.config.visible ?? true;
  const finalPosition =
    position ?? avatarContext?.state.config.position ?? "floating";
  const processingState =
    propsProcessingState ??
    avatarContext?.state.processingState ??
    BotProcessingState.IDLE;
  const isSpeaking =
    propsIsSpeaking ?? avatarContext?.state.isSpeaking ?? false;
  const audioLevel = propsAudioLevel ?? avatarContext?.state.audioLevel ?? 0;

  const [cognitiveState, setCognitiveState] =
    useState<UnifiedCognitiveState | null>(null);
  const [, setCurrentExpression] = useState<Expression>("neutral");
  const [emotionalVector, setEmotionalVector] = useState<EmotionalVector>({
    neutral: 1.0,
  });
  const [cognitiveVisualState, setCognitiveVisualState] =
    useState<CognitiveVisualState>(() =>
      mapCognitiveStateToVisualState(null, BotProcessingState.IDLE, false, 0),
    );

  const fillsConversationStrip = finalPosition === "floating";
  const finalWidth =
    fillsConversationStrip && stripSize.width > 0
      ? stripSize.width
      : configuredWidth;
  const finalHeight =
    fillsConversationStrip && stripSize.height > 0
      ? stripSize.height
      : configuredHeight;
  // Fill factor for contain-fit: the standing figure should fill the strip.
  const stripScale = fillsConversationStrip ? 0.97 : 0.92;
  const outfit = useMemo(() => {
    const resolved = resolveMiaraOutfit({
      id: avatarContext?.state.config.outfit,
      hiddenGroups: avatarContext?.state.config.outfitHiddenGroups,
      hueShift: avatarContext?.state.config.outfitHueShift,
    });
    const hue = avatarContext?.state.config.outfitHueShift;
    const hiddenGroups = mergeIdentityHiddenGroups(
      avatarContext?.state.config.identity,
      resolved.hiddenGroups,
    );
    return typeof hue === "number"
      ? { ...resolved, hiddenGroups, hueShift: hue }
      : { ...resolved, hiddenGroups };
  }, [
    avatarContext?.state.config.outfit,
    avatarContext?.state.config.outfitHiddenGroups,
    avatarContext?.state.config.outfitHueShift,
  ]);

  const avatarController = useRef<Live2DAvatarController | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeSizeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastCognitiveSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!fillsConversationStrip) return undefined;
    const element = stripRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;

    const applySize = (nextWidth: number, nextHeight: number) => {
      const widthPx = Math.round(nextWidth);
      const heightPx = Math.round(nextHeight);
      if (widthPx <= 0 || heightPx <= 0) return;
      setStripSize((previous) =>
        previous.width === widthPx && previous.height === heightPx
          ? previous
          : { width: widthPx, height: heightPx },
      );
    };

    applySize(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fillsConversationStrip, finalVisible]);

  // Handle avatar controller ready
  const handleAvatarReady = useCallback(
    (controller: Live2DAvatarController) => {
      avatarController.current = controller;
      // Register controller with context if available
      avatarContext?.setController(controller);
      const reportNativeSize = () => {
        const nativeSize = controller.getNativeSize?.();
        if (nativeSize && nativeSize.width > 0 && nativeSize.height > 0) {
          onNativeSize?.(nativeSize);
        }
      };
      reportNativeSize();
      // Mesh bounds settle after the first Cubism update; pixel fit follows.
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          requestAnimationFrame(reportNativeSize);
        });
      }
      for (const timer of nativeSizeTimersRef.current) {
        clearTimeout(timer);
      }
      nativeSizeTimersRef.current = [250, 700].map((delay) =>
        setTimeout(reportNativeSize, delay),
      );
      controller.applyOutfit?.(outfit);
      applyIdentityLook(
        controller,
        avatarContext?.state.config.identity,
        avatarContext?.state.config.automeshAtlas,
        avatarContext?.state.config.automeshMapping?.parameters,
      );
      onReady?.();
    },
    [onReady, onNativeSize, avatarContext, outfit],
  );

  useEffect(() => {
    applyIdentityLook(
      avatarController.current,
      avatarContext?.state.config.identity,
      avatarContext?.state.config.automeshAtlas,
      avatarContext?.state.config.automeshMapping?.parameters,
    );
  }, [
    avatarContext?.state.config.automeshAtlas,
    avatarContext?.state.config.automeshMapping?.parameters,
    avatarContext?.state.config.identity,
  ]);

  // Update cognitive state from orchestrator. The avatar is a visual expression
  // layer, so it should follow meaningful cognitive drift rather than every raw
  // polling tick. This mirrors the Echo introspection pattern: observe, compare,
  // then act only when the self-state has actually changed.
  useEffect(() => {
    if (!finalVisible) return undefined;

    const updateCognitiveState = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }

      const orchestrator = getOrchestrator();
      if (!orchestrator) return;

      const state = orchestrator.getState();
      const signature = getCognitiveStateSignature(state);
      if (signature === lastCognitiveSignatureRef.current) return;

      lastCognitiveSignatureRef.current = signature;
      setCognitiveState(state);
    };

    // Initial update
    updateCognitiveState();

    updateIntervalRef.current = setInterval(
      updateCognitiveState,
      AVATAR_STATE_POLL_MS,
    );

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      for (const timer of nativeSizeTimersRef.current) {
        clearTimeout(timer);
      }
      nativeSizeTimersRef.current = [];
    };
  }, [finalVisible]);

  // Update expression based on cognitive state and processing state
  useEffect(() => {
    const newExpression = mapCognitiveStateToExpression(
      cognitiveState,
      processingState,
    );
    setCurrentExpression((previous) =>
      previous === newExpression ? previous : newExpression,
    );

    const newEmotionalVector =
      mapCognitiveStateToEmotionalVector(cognitiveState);
    setEmotionalVector((previous) =>
      emotionalVectorsEqual(previous, newEmotionalVector)
        ? previous
        : newEmotionalVector,
    );

    const nextCognitiveVisualState = mapCognitiveStateToVisualState(
      cognitiveState,
      processingState,
      isSpeaking,
      audioLevel,
    );
    setCognitiveVisualState((previous) =>
      cognitiveVisualStatesEqual(previous, nextCognitiveVisualState)
        ? previous
        : nextCognitiveVisualState,
    );
  }, [cognitiveState, processingState, isSpeaking, audioLevel]);

  // Trigger motion based on processing state changes
  useEffect(() => {
    if (!avatarController.current) return;

    let motion: AvatarMotion | null = null;

    switch (processingState) {
      case BotProcessingState.LISTENING:
        motion = "tilting_head";
        break;
      case BotProcessingState.THINKING:
        motion = "thinking";
        break;
      case BotProcessingState.RESPONDING:
        motion = "nodding";
        break;
    }

    if (motion) {
      avatarController.current.playMotion(motion);
    }
  }, [processingState]);

  if (!finalVisible) {
    return null;
  }

  const identity = avatarContext?.state.config.identity ?? "miara";
  const lockedExpression = resolveAvatarExpression(
    avatarContext?.state.config.expression,
  );
  const expressionLocked = lockedExpression !== LIVE_AVATAR_EXPRESSION;
  const containerClass = `deep-tree-echo-avatar-display ${className} ${
    finalPosition === "floating" ? "floating-avatar" : "inline-avatar"
  }`;

  return (
    <div
      className={containerClass}
      ref={stripRef}
      data-identity={identity}
      data-expression={lockedExpression}
      data-testid="deep-tree-echo-avatar-display"
    >
      <Live2DAvatar
        model={avatarContext?.state.config.model ?? "miara"}
        width={finalWidth}
        height={finalHeight}
        scale={stripScale}
        fillContainer={fillsConversationStrip}
        emotionalState={expressionLocked ? undefined : emotionalVector}
        cognitiveVisualState={
          expressionLocked ? undefined : cognitiveVisualState
        }
        audioLevel={audioLevel}
        isSpeaking={isSpeaking}
        outfit={outfit}
        manualExpression={
          isMiaraCubismExpressionName(lockedExpression)
            ? lockedExpression
            : undefined
        }
        onControllerReady={handleAvatarReady}
        showLoading={true}
        showError={true}
        mode="live2d"
      />
      <div className="avatar-look-controls">
        <AvatarIdentityPicker variant="compact" />
        <MiaraOutfitPicker variant="compact" />
        <MiaraExpressionPicker variant="compact" />
      </div>
      {processingState !== BotProcessingState.IDLE && (
        <div className="avatar-status-indicator">
          <span className={`status-badge status-${processingState}`}>
            {processingState}
          </span>
        </div>
      )}
    </div>
  );
};

export { BotProcessingState };
export default DeepTreeEchoAvatarDisplay;
