/**
 * Avatar Types for Deep Tree Echo Visual Representation
 *
 * Defines expressions, emotions, and avatar state for visual AI representation.
 */

/**
 * Avatar expressions - visual states the avatar can display
 */
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

/**
 * Emotional vector from PersonaCore
 * Maps emotion names to intensities (0-1 scale)
 */
export interface EmotionalVector {
  joy: number;
  interest: number;
  surprise: number;
  sadness: number;
  anger: number;
  fear: number;
  disgust: number;
  contempt: number;
  [key: string]: number;
}

/**
 * Current avatar state with active expression and transition info
 */
export interface AvatarState {
  /** Current active expression */
  currentExpression: Expression;
  /** Previous expression (for transitions) */
  previousExpression: Expression | null;
  /** Transition progress 0-1 (1 = complete) */
  transitionProgress: number;
  /** Timestamp of last state change */
  lastUpdated: number;
  /** Whether avatar is currently speaking */
  isSpeaking: boolean;
  /** Blinking state */
  isBlinking: boolean;
}

/**
 * Motion/animation types for the avatar
 */
export type AvatarMotion =
  | "idle"
  | "talking"
  | "nodding"
  | "shaking_head"
  | "tilting_head"
  | "breathing"
  | "wave"
  | "nod"
  | "shake"
  | "thinking";

/**
 * Animation request for avatar motion
 */
export interface MotionRequest {
  motion: AvatarMotion;
  duration?: number;
  loop?: boolean;
}

/**
 * Avatar event types for state changes
 */
export interface AvatarEvent {
  type: "expression_change" | "motion_start" | "motion_end" | "state_update";
  state: AvatarState;
  timestamp: number;
}

/**
 * Listener callback for avatar events
 */
export type AvatarEventListener = (event: AvatarEvent) => void;

/**
 * Configuration for the avatar controller
 */
export interface AvatarControllerConfig {
  /** How often to poll for emotional state changes (ms) */
  updateInterval: number;
  /** Duration of expression transitions (ms) */
  transitionDuration: number;
  /** Enable automatic blinking */
  autoBlinking: boolean;
  /** Blinking interval range [min, max] in ms */
  blinkInterval: [number, number];
}

/**
 * Default avatar controller configuration
 */
export const DEFAULT_AVATAR_CONFIG: AvatarControllerConfig = {
  updateInterval: 100,
  transitionDuration: 300,
  autoBlinking: true,
  blinkInterval: [2000, 6000],
};
