/**
 * Named Melody poses. Each pose is a Cubism parameter snapshot plus the
 * expression and motion already shipped in `models/melody/`.
 *
 * The bind pose is the A-pose still (`images/avatar/identities/melody.webp`):
 * arms out, wings open, high ponytail, gold headset, silver crop, black skirt.
 */

import type { Expression, AvatarMotion } from "../types";
import type { MiaraCubismExpressionName } from "../miara-expressions";
import { MELODY_PARAMETER_PROFILE, mergeParameterProfile } from "./parameters";

export const MELODY_POSE_MAP_VERSION = 1 as const;

export const MELODY_POSE_IDS = [
  "a-pose",
  "idle",
  "talk",
  "listen",
  "smile",
  "laugh",
  "wonder",
  "think",
  "surprise",
  "sad",
  "awe",
  "wave",
] as const;

export type MelodyPoseId = (typeof MELODY_POSE_IDS)[number];

export const DEFAULT_MELODY_POSE_ID: MelodyPoseId = "a-pose";

export type MelodyPoseMotionGroup = "Idle" | "Tap" | "Flic";

export type MelodyPose = {
  readonly id: MelodyPoseId;
  readonly label: string;
  readonly description: string;
  /** Cubism `.exp3.json` name, or live cognitive drive. */
  readonly expression: MiaraCubismExpressionName | "live";
  readonly motion: MelodyPoseMotionGroup;
  readonly semanticMotion: AvatarMotion;
  readonly semanticExpression: Expression;
  readonly parameters: Readonly<Record<string, number>>;
};

const FACE = MELODY_PARAMETER_PROFILE;

/** A-pose body: arms out, wings open, standing, no water stage. */
const A_POSE_BODY: Record<string, number> = {
  ParamBodyAngleX: 0,
  ParamBodyAngleZ: 0,
  ParamBreath: 0.25,
  ParamArmL1: 0.45,
  ParamArmL2: 0.1,
  ParamArmL3: 0,
  ParamArmR1: 0.45,
  ParamArmR2: 0.1,
  ParamArmR3: 0,
  ParamLegL1X: 0,
  ParamLegL1Z: 0,
  ParamLegR1X: 0,
  ParamLegR1Z: 0,
  ParamFlapping3: 0.35,
  ParamFlapping4: 0.35,
  ParamFlapping7: 0.3,
  ParamFlapping8: 0.3,
  ParamHairFront: 0,
  ParamHairSide: 0,
  ParamHairBack: 0,
  ParamHairTail: 0.15,
};

function pose(
  id: MelodyPoseId,
  label: string,
  description: string,
  expression: MiaraCubismExpressionName | "live",
  motion: MelodyPoseMotionGroup,
  semanticMotion: AvatarMotion,
  semanticExpression: Expression,
  overlay: Record<string, number>,
): MelodyPose {
  return {
    id,
    label,
    description,
    expression,
    motion,
    semanticMotion,
    semanticExpression,
    parameters: mergeParameterProfile(
      mergeParameterProfile(FACE, A_POSE_BODY),
      overlay,
    ),
  };
}

export const MELODY_POSES: readonly MelodyPose[] = [
  pose(
    "a-pose",
    "A-pose",
    "Bind pose from the Melody still — arms out, wings open, gentle smile.",
    "JOY_03_GentleSmile",
    "Idle",
    "idle",
    "neutral",
    {},
  ),
  pose(
    "idle",
    "Idle",
    "Resting loop. Soft breath, wings slightly folded from full A-pose.",
    "live",
    "Idle",
    "idle",
    "neutral",
    {
      ParamArmL1: 0.2,
      ParamArmR1: 0.2,
      ParamFlapping3: 0.15,
      ParamFlapping4: 0.15,
      ParamMouthForm: 0.2,
      ParamMouthOpenY: 0,
    },
  ),
  pose(
    "talk",
    "Talk",
    "Open vowel + tap-body gesture while speaking.",
    "SPEAK_01_OpenVowel",
    "Tap",
    "talking",
    "focused",
    {
      ParamMouthOpenY: 0.55,
      ParamMouthForm: 0.2,
      ParamArmL1: 0.3,
      ParamArmR1: 0.15,
    },
  ),
  pose(
    "listen",
    "Listen",
    "Eyes open, mouth closed, slight head tilt toward the speaker.",
    "NEUTRAL_Reset",
    "Flic",
    "tilting_head",
    "empathetic",
    {
      ParamAngleZ: -6,
      ParamAngleX: 4,
      ParamMouthOpenY: 0,
      ParamMouthForm: 0.1,
      ParamEyeLOpen: 1,
      ParamEyeROpen: 1,
    },
  ),
  pose(
    "smile",
    "Smile",
    "Broad smile from the A-pose still.",
    "JOY_01_BroadSmile",
    "Idle",
    "idle",
    "happy",
    {
      ParamMouthForm: 0.7,
      ParamMouthOpenY: 0.25,
      ParamEyeLSmile: 0.7,
      ParamEyeRSmile: 0.7,
    },
  ),
  pose(
    "laugh",
    "Laugh",
    "Exuberant laugh with a tap-body bounce.",
    "JOY_02_Laughing",
    "Tap",
    "talking",
    "playful",
    {
      ParamMouthForm: 0.85,
      ParamMouthOpenY: 0.7,
      ParamEyeLSmile: 0.9,
      ParamEyeRSmile: 0.9,
      ParamBodyAngleZ: 4,
    },
  ),
  pose(
    "wonder",
    "Wonder",
    "Curious gaze, head tipped, wings a little higher.",
    "WONDER_02_CuriousGaze",
    "Flic",
    "tilt_head_right",
    "curious",
    {
      ParamAngleY: 8,
      ParamAngleZ: 5,
      ParamBrowLY: 0.35,
      ParamBrowRY: 0.35,
      ParamFlapping3: 0.5,
      ParamFlapping4: 0.5,
    },
  ),
  pose(
    "think",
    "Think",
    "Contemplative, chin in, arms closer.",
    "WONDER_03_Contemplative",
    "Idle",
    "thinking",
    "thinking",
    {
      ParamAngleY: -4,
      ParamAngleX: 6,
      ParamArmL1: 0.15,
      ParamArmR1: 0.55,
      ParamMouthForm: 0,
      ParamMouthOpenY: 0,
    },
  ),
  pose(
    "surprise",
    "Surprise",
    "Startled — eyes wide, wings flare.",
    "SURPRISE_01_Startled",
    "Flic",
    "shaking_head",
    "surprised",
    {
      ParamEyeLOpen: 1,
      ParamEyeROpen: 1,
      ParamEyeLSmile: 0,
      ParamEyeRSmile: 0,
      ParamMouthOpenY: 0.45,
      ParamBrowLY: 0.55,
      ParamBrowRY: 0.55,
      ParamFlapping3: 0.7,
      ParamFlapping4: 0.7,
      ParamFlapping7: 0.6,
      ParamFlapping8: 0.6,
    },
  ),
  pose(
    "sad",
    "Sad",
    "Melancholy — head down, wings droop.",
    "SADNESS_01_Melancholy",
    "Idle",
    "idle",
    "concerned",
    {
      ParamAngleY: -8,
      ParamBrowLY: -0.35,
      ParamBrowRY: -0.35,
      ParamMouthForm: -0.3,
      ParamMouthOpenY: 0,
      ParamEyeLOpen: 0.7,
      ParamEyeROpen: 0.7,
      ParamFlapping3: 0.05,
      ParamFlapping4: 0.05,
    },
  ),
  pose(
    "awe",
    "Awe",
    "Upward gaze from the photo set.",
    "PHOTO_Awe",
    "Flic",
    "tilting_head",
    "contemplative",
    {
      ParamAngleY: 12,
      ParamEyeBallY: 0.6,
      ParamMouthOpenY: 0.2,
      ParamFlapping3: 0.45,
      ParamFlapping4: 0.45,
    },
  ),
  pose(
    "wave",
    "Wave",
    "Greeting — right arm raised from A-pose.",
    "JOY_03_GentleSmile",
    "Tap",
    "wave",
    "happy",
    {
      ParamArmR1: 0.85,
      ParamArmR2: 0.4,
      ParamArmR3: 0.2,
      ParamArmL1: 0.25,
      ParamAngleZ: 4,
    },
  ),
];

const POSE_BY_ID: Readonly<Record<MelodyPoseId, MelodyPose>> =
  Object.fromEntries(MELODY_POSES.map((item) => [item.id, item])) as Record<
    MelodyPoseId,
    MelodyPose
  >;

export function isMelodyPoseId(value: unknown): value is MelodyPoseId {
  return (
    typeof value === "string" &&
    (MELODY_POSE_IDS as readonly string[]).includes(value)
  );
}

export function resolveMelodyPose(id: unknown): MelodyPose {
  return POSE_BY_ID[isMelodyPoseId(id) ? id : DEFAULT_MELODY_POSE_ID];
}

export function parametersForMelodyPose(id: unknown): Record<string, number> {
  return { ...resolveMelodyPose(id).parameters };
}

export function poseForExpression(expression: Expression): MelodyPose {
  const match = MELODY_POSES.find(
    (item) => item.semanticExpression === expression,
  );
  return match ?? resolveMelodyPose("idle");
}

export function poseForMotion(motion: AvatarMotion): MelodyPose {
  const match = MELODY_POSES.find((item) => item.semanticMotion === motion);
  return match ?? resolveMelodyPose("idle");
}

export function serializeMelodyPoseMap(): {
  version: typeof MELODY_POSE_MAP_VERSION;
  identity: "melody";
  sourceModel: string;
  defaultPose: MelodyPoseId;
  poses: readonly MelodyPose[];
} {
  return {
    version: MELODY_POSE_MAP_VERSION,
    identity: "melody",
    sourceModel: "models/melody/melody_t03.model3.json",
    defaultPose: DEFAULT_MELODY_POSE_ID,
    poses: MELODY_POSES,
  };
}
