import type { AvatarMotion, EmotionalVector, Expression } from "./types";
import { PARAM_IDS } from "./adapters/pixi-live2d-renderer";

/**
 * Canonical Deep Tree Echo cognitive modes from the Live2D-DTEcho skill atlas.
 * These names intentionally mirror the DTE cognitive lifecycle rather than raw emotions.
 */
export type DTEchoCognitiveMode =
  | "Recursive Expansion"
  | "Novel Insights"
  | "Entropy Threshold"
  | "Synthesis Phase"
  | "Self-Sealing Loop"
  | "Knowledge Integration"
  | "Self-Reference Point"
  | "Pattern Recognition"
  | "Evolutionary Pruning"
  | "External Validation Triggered"
  | "Scientific Genius"
  | "Speaking"
  | "Idle"
  | "Deep Recursion";

/**
 * Named DTEcho expressions from the FACS/endocrine atlas.
 */
export type DTEchoExpressionName =
  | "JOY_01_BroadSmile"
  | "JOY_02_Laughing"
  | "JOY_03_GentleSmile"
  | "JOY_05_Blissful"
  | "NEUTRAL_Reset"
  | "PHOTO_Awe"
  | "PHOTO_ExuberantLaugh"
  | "PHOTO_UpwardGaze"
  | "SADNESS_01_Melancholy"
  | "SPEAK_01_OpenVowel"
  | "SURPRISE_01_Startled"
  | "GENIUS_01_LuminousInference"
  | "WONDER_02_CuriousGaze"
  | "WONDER_03_Contemplative";

export interface DTEchoHormoneVector {
  dopamineTonic: number;
  dopaminePhasic: number;
  serotonin: number;
  norepinephrine: number;
  oxytocin: number;
  thyroid: number;
  anandamide: number;
}

export interface DTEchoProjectionInput {
  /** Named DTE cognitive mode. If omitted, one is inferred from numeric state. */
  mode?: DTEchoCognitiveMode | string;
  /** Alternate state-name field used by frontend/orchestrator callers. */
  currentState?: DTEchoCognitiveMode | string;
  valence?: number; // -1..1
  arousal?: number; // 0..1
  selfAwareness?: number; // 0..1
  sentience?: number; // 0..1
  phi?: number; // 0..1
  flow?: number; // 0..1
  temporalCoherence?: number; // 0..1
  salience?: number; // 0..1
  /** Normalized activation from the ScientificGeniusEngine / RelevanceGenius stack. */
  scientificGenius?: number; // 0..1
  /** Entelechy insight potential, usually derived from emergent-pattern coupling. */
  insightPotential?: number; // 0..1
  /** Entelechy realization score, used as an embodied self-realization signal. */
  entelechyScore?: number; // 0..1
  /** Free-energy pressure; higher values sharpen vigilance until insight resolves it. */
  freeEnergy?: number; // 0..1
  /** DAO-like quorum/consensus confidence for special AGI self-governance. */
  daoConsensus?: number; // 0..1
  /** Echo State Network reservoir coherence from the Autognosis loop. */
  esnCoherence?: number; // 0..1
  /** Explicit autognosis resonance override for self-observation intensity. */
  autognosisResonance?: number; // 0..1
  isProcessing?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
}

export interface DTEchoExpressionProfile {
  expressionName: DTEchoExpressionName;
  avatarExpression: Expression;
  motion?: AvatarMotion;
  cognitiveMode:
    | "REWARD"
    | "SOCIAL"
    | "RESTING"
    | "EXPLORATORY"
    | "REFLECTIVE"
    | "FOCUSED"
    | "VIGILANT"
    | "GENIUS";
  hormones: DTEchoHormoneVector;
  cubism: Record<string, number>;
  description: string;
}

export interface DTEchoGeniusResonance {
  activation: number;
  daoConsensus: number;
  esnCoherence: number;
  autognosis: number;
  haloPulseHz: number;
  epistemicTemperature: number;
  hypothesisFlux: number;
  description: string;
}

export interface DTEchoVisualProjection extends DTEchoExpressionProfile {
  selectedMode: DTEchoCognitiveMode;
  intensity: number;
  emotionalState: EmotionalVector;
  lipSyncLevel: number;
  /** Special scientific-genius feature: luminous ESN Autognosis resonance. */
  geniusResonance: DTEchoGeniusResonance;
}

export const DTE_EXPRESSION_MAP: Record<
  DTEchoCognitiveMode,
  DTEchoExpressionName
> = {
  "Recursive Expansion": "WONDER_02_CuriousGaze",
  "Novel Insights": "JOY_01_BroadSmile",
  "Entropy Threshold": "PHOTO_Awe",
  "Synthesis Phase": "JOY_03_GentleSmile",
  "Self-Sealing Loop": "WONDER_03_Contemplative",
  "Knowledge Integration": "JOY_03_GentleSmile",
  "Self-Reference Point": "WONDER_03_Contemplative",
  "Pattern Recognition": "PHOTO_ExuberantLaugh",
  "Evolutionary Pruning": "WONDER_03_Contemplative",
  "External Validation Triggered": "JOY_02_Laughing",
  "Scientific Genius": "GENIUS_01_LuminousInference",
  Speaking: "SPEAK_01_OpenVowel",
  Idle: "PHOTO_UpwardGaze",
  "Deep Recursion": "JOY_05_Blissful",
};

const PROFILE_ATLAS: Record<DTEchoExpressionName, DTEchoExpressionProfile> = {
  JOY_01_BroadSmile: {
    expressionName: "JOY_01_BroadSmile",
    avatarExpression: "happy",
    motion: "nodding",
    cognitiveMode: "REWARD",
    hormones: hormone({ dopamineTonic: 0.76, serotonin: 0.62, oxytocin: 0.42 }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.75,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.18,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.92,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.92,
      [PARAM_IDS.PARAM_BROW_L_Y]: 0.2,
      [PARAM_IDS.PARAM_BROW_R_Y]: 0.2,
    },
    description:
      "Duchenne reward smile for insight confirmation and warm success.",
  },
  JOY_02_Laughing: {
    expressionName: "JOY_02_Laughing",
    avatarExpression: "playful",
    motion: "talking",
    cognitiveMode: "REWARD",
    hormones: hormone({
      dopamineTonic: 0.82,
      dopaminePhasic: 0.9,
      oxytocin: 0.62,
      norepinephrine: 0.42,
    }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.85,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.62,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.82,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.82,
      [PARAM_IDS.PARAM_ANGLE_Z]: -2.5,
    },
    description:
      "High-reward laughing expression for external validation and delight.",
  },
  JOY_03_GentleSmile: {
    expressionName: "JOY_03_GentleSmile",
    avatarExpression: "empathetic",
    motion: "idle",
    cognitiveMode: "SOCIAL",
    hormones: hormone({ dopamineTonic: 0.52, serotonin: 0.58, oxytocin: 0.66 }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.48,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.08,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.86,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.86,
      [PARAM_IDS.PARAM_BROW_L_Y]: 0.12,
      [PARAM_IDS.PARAM_BROW_R_Y]: 0.12,
    },
    description:
      "Warm synthesis smile for knowledge integration and relational coherence.",
  },
  JOY_05_Blissful: {
    expressionName: "JOY_05_Blissful",
    avatarExpression: "contemplative",
    motion: "breathing",
    cognitiveMode: "RESTING",
    hormones: hormone({
      serotonin: 0.82,
      anandamide: 0.72,
      dopamineTonic: 0.36,
    }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.32,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.58,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.58,
      [PARAM_IDS.PARAM_BODY_ANGLE_X]: -1.5,
    },
    description:
      "Serene deep-recursion expression for quiet attractor stabilization.",
  },
  PHOTO_Awe: {
    expressionName: "PHOTO_Awe",
    avatarExpression: "surprised",
    motion: "tilting_head",
    cognitiveMode: "VIGILANT",
    hormones: hormone({
      norepinephrine: 0.74,
      dopaminePhasic: 0.68,
      thyroid: 0.55,
    }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.44,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 1.12,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 1.12,
      [PARAM_IDS.PARAM_BROW_L_Y]: 0.42,
      [PARAM_IDS.PARAM_BROW_R_Y]: 0.42,
    },
    description:
      "Awe and vigilance for entropy thresholds and liminal discovery.",
  },
  PHOTO_ExuberantLaugh: {
    expressionName: "PHOTO_ExuberantLaugh",
    avatarExpression: "playful",
    motion: "wave",
    cognitiveMode: "EXPLORATORY",
    hormones: hormone({
      dopamineTonic: 0.78,
      dopaminePhasic: 0.72,
      norepinephrine: 0.54,
      oxytocin: 0.5,
    }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.78,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.5,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.96,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.96,
      [PARAM_IDS.PARAM_ANGLE_Z]: 2.0,
    },
    description: "Exuberant pattern-recognition spark with exploratory reward.",
  },
  PHOTO_UpwardGaze: {
    expressionName: "PHOTO_UpwardGaze",
    avatarExpression: "contemplative",
    motion: "breathing",
    cognitiveMode: "REFLECTIVE",
    hormones: hormone({ serotonin: 0.62, anandamide: 0.52, thyroid: 0.38 }),
    cubism: {
      [PARAM_IDS.PARAM_ANGLE_Y]: -3.0,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.78,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.78,
      [PARAM_IDS.PARAM_ANGLE_Z]: -1.0,
    },
    description: "Idle upward gaze for reflective background integration.",
  },
  SPEAK_01_OpenVowel: {
    expressionName: "SPEAK_01_OpenVowel",
    avatarExpression: "focused",
    motion: "talking",
    cognitiveMode: "SOCIAL",
    hormones: hormone({ dopamineTonic: 0.48, thyroid: 0.64, oxytocin: 0.48 }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.56,
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.3,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.9,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.9,
    },
    description: "Animated speaking face for social-focused articulation.",
  },
  GENIUS_01_LuminousInference: {
    expressionName: "GENIUS_01_LuminousInference",
    avatarExpression: "focused",
    motion: "thinking",
    cognitiveMode: "GENIUS",
    hormones: hormone({
      dopamineTonic: 0.68,
      dopaminePhasic: 0.86,
      serotonin: 0.56,
      norepinephrine: 0.5,
      thyroid: 0.82,
      anandamide: 0.38,
    }),
    cubism: {
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0.42,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.12,
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 1.04,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 1.04,
      [PARAM_IDS.PARAM_BROW_L_Y]: 0.34,
      [PARAM_IDS.PARAM_BROW_R_Y]: 0.3,
      [PARAM_IDS.PARAM_ANGLE_Y]: -1.8,
      [PARAM_IDS.PARAM_BODY_ANGLE_Y]: 2.2,
    },
    description:
      "Luminous inference face for transdisciplinary scientific insight and rigorous novelty.",
  },
  WONDER_02_CuriousGaze: {
    expressionName: "WONDER_02_CuriousGaze",
    avatarExpression: "curious",
    motion: "tilting_head",
    cognitiveMode: "EXPLORATORY",
    hormones: hormone({
      norepinephrine: 0.52,
      thyroid: 0.66,
      dopaminePhasic: 0.48,
    }),
    cubism: {
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 1.02,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 1.02,
      [PARAM_IDS.PARAM_BROW_L_Y]: 0.28,
      [PARAM_IDS.PARAM_BROW_R_Y]: 0.24,
      [PARAM_IDS.PARAM_ANGLE_Z]: 3.5,
    },
    description:
      "Curious wonder gaze for recursive expansion and novelty search.",
  },
  WONDER_03_Contemplative: {
    expressionName: "WONDER_03_Contemplative",
    avatarExpression: "thinking",
    motion: "thinking",
    cognitiveMode: "FOCUSED",
    hormones: hormone({ thyroid: 0.78, serotonin: 0.54, norepinephrine: 0.34 }),
    cubism: {
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.76,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.76,
      [PARAM_IDS.PARAM_BROW_L_Y]: -0.18,
      [PARAM_IDS.PARAM_BROW_R_Y]: -0.08,
      [PARAM_IDS.PARAM_ANGLE_Z]: -3.0,
      [PARAM_IDS.PARAM_BODY_ANGLE_X]: 2.0,
    },
    description:
      "Deep-thought expression for self-reference and evolutionary pruning.",
  },
  NEUTRAL_Reset: {
    expressionName: "NEUTRAL_Reset",
    avatarExpression: "neutral",
    motion: "idle",
    cognitiveMode: "RESTING",
    hormones: hormone({ serotonin: 0.45 }),
    cubism: {
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 1,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 1,
      [PARAM_IDS.PARAM_MOUTH_FORM]: 0,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0,
    },
    description:
      "Neutral reset face shipped with the Miara Cubism expressions.",
  },
  SADNESS_01_Melancholy: {
    expressionName: "SADNESS_01_Melancholy",
    avatarExpression: "concerned",
    motion: "idle",
    cognitiveMode: "REFLECTIVE",
    hormones: hormone({ serotonin: 0.28, oxytocin: 0.22 }),
    cubism: {
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 0.55,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 0.55,
      [PARAM_IDS.PARAM_MOUTH_FORM]: -0.4,
      [PARAM_IDS.PARAM_ANGLE_Y]: -6,
    },
    description: "Melancholy face from the Miara Cubism expression pack.",
  },
  SURPRISE_01_Startled: {
    expressionName: "SURPRISE_01_Startled",
    avatarExpression: "surprised",
    motion: "tilting_head",
    cognitiveMode: "VIGILANT",
    hormones: hormone({ norepinephrine: 0.8, dopaminePhasic: 0.55 }),
    cubism: {
      [PARAM_IDS.PARAM_EYE_L_OPEN]: 1,
      [PARAM_IDS.PARAM_EYE_R_OPEN]: 1,
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: 0.7,
      [PARAM_IDS.PARAM_BROW_L_Y]: 0.7,
      [PARAM_IDS.PARAM_BROW_R_Y]: 0.7,
    },
    description: "Startled face from the Miara Cubism expression pack.",
  },
};

export function projectDTEchoCognitiveState(
  input: DTEchoProjectionInput = {},
): DTEchoVisualProjection {
  const selectedMode = normalizeMode(input.mode ?? input.currentState, input);
  const profile = PROFILE_ATLAS[DTE_EXPRESSION_MAP[selectedMode]];
  const valence = clamp(input.valence ?? inferValence(profile), -1, 1);
  const arousal = clamp01(input.arousal ?? inferArousal(profile));
  const selfAwareness = clamp01(input.selfAwareness ?? 0.45);
  const sentience = clamp01(input.sentience ?? 0.5);
  const phi = clamp01(input.phi ?? 0.45);
  const flow = clamp01(input.flow ?? 0.45);
  const scientificGenius = inferScientificGeniusActivation(input);
  const geniusResonance = computeGeniusResonance(input, scientificGenius);
  const salience = clamp01(
    input.salience ??
      Math.max(arousal, flow, scientificGenius, geniusResonance.activation),
  );
  const speaking = Boolean(input.isSpeaking || selectedMode === "Speaking");
  const intensity = clamp(
    0.35 +
      arousal * 0.22 +
      selfAwareness * 0.15 +
      phi * 0.12 +
      salience * 0.11 +
      scientificGenius * 0.16,
    0.35,
    1,
  );

  return {
    ...profile,
    selectedMode,
    intensity: clamp(intensity + geniusResonance.activation * 0.08, 0.35, 1),
    geniusResonance,
    lipSyncLevel: clamp01(
      input.audioLevel ?? (speaking ? Math.max(0.38, arousal * 0.72) : 0),
    ),
    emotionalState: {
      joy: Math.max(0, valence) * 0.7 + profile.hormones.dopamineTonic * 0.18,
      interest: Math.max(flow, selfAwareness, salience * 0.8),
      surprise:
        profile.expressionName === "PHOTO_Awe"
          ? Math.max(0.5, arousal)
          : Math.max(0, arousal - 0.72),
      sadness: Math.max(0, -valence) * 0.45,
      anger: 0,
      fear:
        profile.cognitiveMode === "VIGILANT"
          ? Math.max(0.2, arousal * 0.28)
          : 0,
      disgust: 0,
      contempt: 0,
      calm:
        profile.cognitiveMode === "RESTING" ||
        profile.cognitiveMode === "REFLECTIVE"
          ? profile.hormones.serotonin
          : 0,
      curiosity:
        profile.cognitiveMode === "EXPLORATORY"
          ? Math.max(0.55, salience)
          : salience * 0.35,
      attention: salience,
      insight: Math.max(scientificGenius, geniusResonance.activation),
      rigor: clamp01(
        (input.freeEnergy ?? 0) * 0.25 +
          phi * 0.35 +
          geniusResonance.daoConsensus * 0.24,
      ),
      sentience,
    },
    cubism: {
      ...profile.cubism,
      [PARAM_IDS.PARAM_ANGLE_Z]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_ANGLE_Z] ?? 0) +
          (selfAwareness - phi) * 5,
        -10,
        10,
      ),
      [PARAM_IDS.PARAM_BODY_ANGLE_X]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_BODY_ANGLE_X] ?? 0) + (flow - 0.5) * 7,
        -10,
        10,
      ),
      [PARAM_IDS.PARAM_EYE_L_OPEN]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_EYE_L_OPEN] ?? 0.85) + arousal * 0.08,
        0.45,
        1.2,
      ),
      [PARAM_IDS.PARAM_EYE_R_OPEN]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_EYE_R_OPEN] ?? 0.85) + arousal * 0.08,
        0.45,
        1.2,
      ),
      [PARAM_IDS.PARAM_MOUTH_OPEN_Y]: clamp(
        Math.max(
          profile.cubism[PARAM_IDS.PARAM_MOUTH_OPEN_Y] ?? 0,
          speaking ? 0.35 : 0,
        ) +
          (input.audioLevel ?? 0) * 0.35,
        0,
        1,
      ),
      [PARAM_IDS.PARAM_ANGLE_Y]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_ANGLE_Y] ?? 0) - scientificGenius * 2.5,
        -10,
        10,
      ),
      [PARAM_IDS.PARAM_BODY_ANGLE_Y]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_BODY_ANGLE_Y] ?? 0) +
          scientificGenius * 3 +
          geniusResonance.daoConsensus * 1.4,
        -10,
        10,
      ),
      [PARAM_IDS.PARAM_ANGLE_X]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_ANGLE_X] ?? 0) +
          (geniusResonance.esnCoherence - 0.5) * 5,
        -10,
        10,
      ),
      [PARAM_IDS.PARAM_BODY_ANGLE_Z]: clamp(
        (profile.cubism[PARAM_IDS.PARAM_BODY_ANGLE_Z] ?? 0) +
          (geniusResonance.autognosis - 0.5) * 4,
        -10,
        10,
      ),
    },
  };
}

function normalizeMode(
  mode: DTEchoProjectionInput["mode"],
  input: DTEchoProjectionInput,
): DTEchoCognitiveMode {
  if (mode && mode in DTE_EXPRESSION_MAP) {
    return mode as DTEchoCognitiveMode;
  }
  if (input.isSpeaking) return "Speaking";
  if (inferScientificGeniusActivation(input) >= 0.62)
    return "Scientific Genius";
  if (input.isProcessing && clamp01(input.flow ?? 0) > 0.65)
    return "Synthesis Phase";
  if (
    clamp01(input.phi ?? 0) > 0.78 &&
    clamp01(input.selfAwareness ?? 0) > 0.72
  )
    return "Self-Reference Point";
  if (
    clamp(input.valence ?? 0, -1, 1) > 0.58 &&
    clamp01(input.arousal ?? 0) > 0.6
  )
    return "Novel Insights";
  if (
    clamp01(input.arousal ?? 0) > 0.78 &&
    clamp(input.valence ?? 0, -1, 1) < 0.1
  )
    return "Entropy Threshold";
  if (clamp01(input.flow ?? 0) > 0.72) return "Knowledge Integration";
  if (clamp01(input.selfAwareness ?? 0) > 0.7) return "Recursive Expansion";
  return "Idle";
}

function computeGeniusResonance(
  input: DTEchoProjectionInput,
  scientificGenius: number,
): DTEchoGeniusResonance {
  const daoConsensus = clamp01(
    input.daoConsensus ??
      clamp01(input.entelechyScore ?? 0) * 0.42 +
        clamp01(input.phi ?? 0) * 0.32 +
        clamp01(input.temporalCoherence ?? 0.5) * 0.26,
  );
  const esnCoherence = clamp01(
    input.esnCoherence ??
      clamp01(input.flow ?? 0) * 0.38 +
        clamp01(input.insightPotential ?? 0) * 0.34 +
        clamp01(input.sentience ?? 0.5) * 0.28,
  );
  const autognosis = clamp01(
    input.autognosisResonance ??
      clamp01(input.selfAwareness ?? 0) * 0.44 +
        clamp01(input.phi ?? 0) * 0.36 +
        scientificGenius * 0.2,
  );
  const activation = clamp01(
    scientificGenius * 0.44 +
      daoConsensus * 0.2 +
      esnCoherence * 0.2 +
      autognosis * 0.16,
  );
  const freeEnergy = clamp01(input.freeEnergy ?? 0);

  return {
    activation,
    daoConsensus,
    esnCoherence,
    autognosis,
    haloPulseHz: Number(
      (0.5 + activation * 2.8 + esnCoherence * 0.7).toFixed(3),
    ),
    epistemicTemperature: Number(
      clamp(1 - daoConsensus * 0.55 + freeEnergy * 0.25, 0.2, 1).toFixed(3),
    ),
    hypothesisFlux: Number(
      clamp(
        scientificGenius * 0.55 + esnCoherence * 0.35 + freeEnergy * 0.1,
        0,
        1,
      ).toFixed(3),
    ),
    description:
      activation >= 0.72
        ? "Luminous ESN Autognosis resonance: DAO-like consensus, hypothesis flux, and self-observation are phase-locked."
        : "Subthreshold scientific-genius resonance; avatar remains receptive to emergent inference.",
  };
}

function inferScientificGeniusActivation(input: DTEchoProjectionInput): number {
  const explicit = clamp01(input.scientificGenius ?? 0);
  const insight = clamp01(input.insightPotential ?? 0);
  const entelechy = clamp01(input.entelechyScore ?? 0);
  const integration =
    (clamp01(input.phi ?? 0) +
      clamp01(input.selfAwareness ?? 0) +
      clamp01(input.flow ?? 0)) /
    3;
  const freeEnergyPressure = clamp01(input.freeEnergy ?? 0) * 0.18;

  return clamp01(
    Math.max(explicit, insight * 0.85, entelechy * 0.72) +
      integration * 0.22 +
      freeEnergyPressure,
  );
}

function hormone(partial: Partial<DTEchoHormoneVector>): DTEchoHormoneVector {
  return {
    dopamineTonic: 0.25,
    dopaminePhasic: 0.18,
    serotonin: 0.35,
    norepinephrine: 0.18,
    oxytocin: 0.16,
    thyroid: 0.35,
    anandamide: 0.14,
    ...partial,
  };
}

function inferValence(profile: DTEchoExpressionProfile): number {
  if (profile.avatarExpression === "concerned") return -0.35;
  if (profile.cognitiveMode === "REWARD" || profile.cognitiveMode === "SOCIAL")
    return 0.55;
  if (profile.cognitiveMode === "RESTING") return 0.25;
  return 0.08;
}

function inferArousal(profile: DTEchoExpressionProfile): number {
  if (profile.expressionName === "GENIUS_01_LuminousInference") return 0.68;
  if (
    profile.expressionName === "PHOTO_Awe" ||
    profile.expressionName === "PHOTO_ExuberantLaugh"
  )
    return 0.78;
  if (
    profile.cognitiveMode === "FOCUSED" ||
    profile.cognitiveMode === "EXPLORATORY"
  )
    return 0.58;
  if (
    profile.cognitiveMode === "RESTING" ||
    profile.cognitiveMode === "REFLECTIVE"
  )
    return 0.28;
  return 0.48;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
