/**
 * DeepTreeEchoAvatarDisplay - Live2D Avatar Integration with Deep Tree Echo Bot
 *
 * This component displays an animated Live2D avatar that responds to the
 * cognitive and emotional state of the Deep Tree Echo AI companion.
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Live2DAvatar } from "../AICompanionHub/Live2DAvatar";
import type {
  Live2DAvatarController,
  Expression,
  AvatarMotion,
  EmotionalVector,
  CognitiveVisualState,
} from "../AICompanionHub/Live2DAvatar";
import { getOrchestrator } from "./CognitiveBridge";
import type { UnifiedCognitiveState } from "./CognitiveBridge";
import {
  useDeepTreeEchoAvatarOptional,
  AvatarProcessingState as BotProcessingState,
} from "./DeepTreeEchoAvatarContext";
// Styles are in scss/components/_deep-tree-echo-avatar.scss

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
    salience,
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
}) => {
  const avatarContext = useDeepTreeEchoAvatarOptional();

  // Use context values if available, otherwise use props
  const finalWidth = width ?? avatarContext?.state.config.width ?? 300;
  const finalHeight = height ?? avatarContext?.state.config.height ?? 300;
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
  const [currentExpression, setCurrentExpression] =
    useState<Expression>("neutral");
  const [emotionalVector, setEmotionalVector] = useState<EmotionalVector>({
    neutral: 1.0,
  });
  const [cognitiveVisualState, setCognitiveVisualState] =
    useState<CognitiveVisualState>(() =>
      mapCognitiveStateToVisualState(null, BotProcessingState.IDLE, false, 0),
    );

  const avatarController = useRef<Live2DAvatarController | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Handle avatar controller ready
  const handleAvatarReady = useCallback(
    (controller: Live2DAvatarController) => {
      avatarController.current = controller;
      // Register controller with context if available
      avatarContext?.setController(controller);
      onReady?.();
    },
    [onReady, avatarContext],
  );

  // Update cognitive state from orchestrator
  useEffect(() => {
    const updateCognitiveState = () => {
      const orchestrator = getOrchestrator();
      if (orchestrator) {
        const state = orchestrator.getState();
        setCognitiveState(state);
      }
    };

    // Initial update
    updateCognitiveState();

    // Poll for updates every 500ms
    updateIntervalRef.current = setInterval(updateCognitiveState, 500);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  // Update expression based on cognitive state and processing state
  useEffect(() => {
    const newExpression = mapCognitiveStateToExpression(
      cognitiveState,
      processingState,
    );
    if (newExpression !== currentExpression) {
      setCurrentExpression(newExpression);
    }

    const newEmotionalVector =
      mapCognitiveStateToEmotionalVector(cognitiveState);
    setEmotionalVector(newEmotionalVector);
    setCognitiveVisualState(
      mapCognitiveStateToVisualState(
        cognitiveState,
        processingState,
        isSpeaking,
        audioLevel,
      ),
    );
  }, [
    cognitiveState,
    processingState,
    currentExpression,
    isSpeaking,
    audioLevel,
  ]);

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

  const containerClass = `deep-tree-echo-avatar-display ${className} ${
    finalPosition === "floating" ? "floating-avatar" : "inline-avatar"
  }`;

  return (
    <div className={containerClass}>
      <Live2DAvatar
        model={avatarContext?.state.config.model ?? "miara"}
        width={finalWidth}
        height={finalHeight}
        scale={0.25}
        emotionalState={emotionalVector}
        cognitiveVisualState={cognitiveVisualState}
        audioLevel={audioLevel}
        isSpeaking={isSpeaking}
        onControllerReady={handleAvatarReady}
        showLoading={true}
        showError={true}
        mode="live2d"
      />
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
