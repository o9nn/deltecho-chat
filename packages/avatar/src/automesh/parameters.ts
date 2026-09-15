/**
 * Cubism parameter offsets that push the shared Miara mesh toward the
 * standing Melody still: open eyes, gentle smile, neutral head.
 */
export const MELODY_PARAMETER_PROFILE: Record<string, number> = {
  ParamEyeLOpen: 0.92,
  ParamEyeROpen: 0.92,
  ParamEyeLSmile: 0.35,
  ParamEyeRSmile: 0.35,
  ParamMouthForm: 0.45,
  ParamMouthOpenY: 0.08,
  ParamBrowLY: 0.15,
  ParamBrowRY: 0.15,
  ParamAngleX: 0,
  ParamAngleY: 0,
  ParamAngleZ: 0,
};

export function mergeParameterProfile(
  base: Record<string, number> | undefined,
  overlay: Record<string, number>,
): Record<string, number> {
  return { ...base, ...overlay };
}
