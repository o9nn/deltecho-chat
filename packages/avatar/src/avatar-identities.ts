/**
 * Companion identities, each with its own Cubism model folder and mesh.
 * Melody loads `models/melody/melody_t03.model3.json`, not Miara.
 */

import { parametersForMelodyPose } from "./automesh/pose-map";
import { resolveIdentityRig, type IdentityRig } from "./automesh/identity-rig";
import {
  IDENTITY_MODEL3_PATHS,
  identityModel3Path,
} from "./automesh/mesh-map";
import {
  resolveMiaraOutfit,
  type MiaraOutfitId,
  type MiaraOutfitState,
  type MiaraPartGroup,
} from "./miara-outfits";

export const AVATAR_IDENTITY_IDS = [
  "miara",
  "deep-tree-echo",
  "melody",
] as const;

export type AvatarIdentityId = (typeof AVATAR_IDENTITY_IDS)[number];

export const DEFAULT_AVATAR_IDENTITY_ID: AvatarIdentityId = "miara";

export { IDENTITY_MODEL3_PATHS, identityModel3Path };

export function modelForAvatarIdentity(id: unknown): AvatarIdentityId {
  return resolveAvatarIdentity(id);
}

export function model3PathForAvatarIdentity(id: unknown): string {
  return identityModel3Path(resolveAvatarIdentity(id));
}

/** Shipped triangle-reprojected Melody atlas on the official Miara UV layout. */
export const SHIPPED_MELODY_ATLAS =
  "./images/avatar/identities/melody-atlas.png";

export interface AvatarIdentitySpec {
  id: AvatarIdentityId;
  label: string;
  description: string;
  /** Live2D preset name. Loads that identity's `*_t03.model3.json`. */
  model: AvatarIdentityId;
  /** Explicit Cubism model3 path for this identity. Never a shared mesh. */
  model3Path: string;
  /** Wardrobe look applied when this identity is selected. */
  outfitId: Exclude<MiaraOutfitId, "custom">;
  /** Picker portrait, relative to the app html root. */
  portrait?: string;
  /** Optional remapped Cubism atlas bound when this identity is selected. */
  overlay?: string;
  /** Extra wardrobe hides that stay on even when the named preset is applied. */
  extraHiddenGroups?: readonly MiaraPartGroup[];
  /** Texture and physics are already in `models/{id}/`; do not hue-rotate. */
  bakedLook?: boolean;
}

export const AVATAR_IDENTITIES: readonly AvatarIdentitySpec[] = [
  {
    id: "miara",
    label: "Miara",
    description: "Official baked mesh and lagoon fairy look.",
    model: "miara",
    model3Path: IDENTITY_MODEL3_PATHS.miara,
    outfitId: "official",
  },
  {
    id: "deep-tree-echo",
    label: "Deep Tree Echo",
    description:
      "Dedicated grove model — moss atlas, living-wing physics, bioluminescent lagoon.",
    model: "deep-tree-echo",
    model3Path: IDENTITY_MODEL3_PATHS["deep-tree-echo"],
    outfitId: "grove",
    portrait: "./images/avatar/identities/deep-tree-echo.webp",
    bakedLook: true,
  },
  {
    id: "melody",
    label: "Melody",
    description:
      "Dedicated Melody model — remapped atlas, crop silhouette, headset motion, no water stage.",
    model: "melody",
    model3Path: IDENTITY_MODEL3_PATHS.melody,
    outfitId: "aria",
    portrait: "./images/avatar/identities/melody.webp",
    overlay: SHIPPED_MELODY_ATLAS,
    extraHiddenGroups: ["chestCloth", "sparkle", "hairAccessory"],
    bakedLook: true,
  },
];

export function extraHiddenGroupsForIdentity(
  id: unknown,
): readonly MiaraPartGroup[] {
  return getAvatarIdentity(id).extraHiddenGroups ?? [];
}

export function mergeIdentityHiddenGroups(
  identity: unknown,
  groups: readonly MiaraPartGroup[],
): MiaraPartGroup[] {
  const merged = new Set<MiaraPartGroup>(groups);
  for (const group of extraHiddenGroupsForIdentity(identity)) {
    merged.add(group);
  }
  return [...merged];
}

export function isAvatarIdentityId(value: unknown): value is AvatarIdentityId {
  return (
    typeof value === "string" &&
    (AVATAR_IDENTITY_IDS as readonly string[]).includes(value)
  );
}

export function getAvatarIdentity(id: unknown): AvatarIdentitySpec {
  const resolved = isAvatarIdentityId(id) ? id : DEFAULT_AVATAR_IDENTITY_ID;
  return AVATAR_IDENTITIES.find(
    (item) => item.id === resolved,
  ) as AvatarIdentitySpec;
}

export function resolveAvatarIdentity(id: unknown): AvatarIdentityId {
  return getAvatarIdentity(id).id;
}

export function lookForAvatarIdentity(id: unknown): MiaraOutfitState {
  return resolveMiaraOutfit({ id: getAvatarIdentity(id).outfitId });
}

export function applyAvatarIdentity(id: unknown): {
  identity: AvatarIdentityId;
  model: AvatarIdentityId;
  outfit: MiaraOutfitState;
  overlay: string | null;
  rig: IdentityRig | null;
} {
  const spec = getAvatarIdentity(id);
  const outfit = resolveMiaraOutfit({ id: spec.outfitId });
  const hiddenGroups = mergeIdentityHiddenGroups(spec.id, outfit.hiddenGroups);
  return {
    identity: spec.id,
    model: spec.model,
    // Baked identity atlases already carry their color; do not hue-rotate.
    outfit: spec.bakedLook
      ? { ...outfit, hiddenGroups, hueShift: 0 }
      : { ...outfit, hiddenGroups },
    overlay: spec.overlay ?? null,
    rig: resolveIdentityRig(spec.id),
  };
}

export { resolveIdentityRig };
export type { IdentityRig };

export function identityHasBakedLook(id: unknown): boolean {
  return getAvatarIdentity(id).bakedLook === true;
}

export function defaultAtlasForIdentity(id: unknown): string | null {
  return getAvatarIdentity(id).overlay ?? null;
}

/**
 * Custom trained atlas still overlays at runtime. The shipped Melody atlas
 * is already the dedicated model's texture, so it is not bound twice.
 */
export function resolveIdentityOverlay(
  identity: unknown,
  customAtlas?: string | null,
): string | null {
  if (resolveAvatarIdentity(identity) !== "melody") return null;
  if (typeof customAtlas === "string" && customAtlas.length > 0) {
    return customAtlas;
  }
  return null;
}

export function resolveIdentityParameters(
  identity: unknown,
  mappingParameters?: Record<string, number> | null,
): Record<string, number> | null {
  if (resolveAvatarIdentity(identity) !== "melody") return null;
  if (mappingParameters && Object.keys(mappingParameters).length > 0) {
    return mappingParameters;
  }
  return parametersForMelodyPose("a-pose");
}

export type IdentityLookController = {
  applyTextureOverlay?: (source: string) => Promise<boolean>;
  clearTextureOverlay?: () => Promise<boolean>;
  applyParameterProfile?: (profile: Record<string, number> | null) => void;
  applyIdentityRig?: (rig: IdentityRig | null) => void;
};

/** Bind texture, face parameters, mesh deform, and physics for an identity. */
export function applyIdentityLook(
  controller: IdentityLookController | null | undefined,
  identity: unknown,
  customAtlas?: string | null,
  mappingParameters?: Record<string, number> | null,
): void {
  if (!controller) return;
  controller.applyIdentityRig?.(resolveIdentityRig(identity));
  const overlay = resolveIdentityOverlay(identity, customAtlas);
  if (overlay) {
    void controller.applyTextureOverlay?.(overlay);
  } else {
    void controller.clearTextureOverlay?.();
  }
  controller.applyParameterProfile?.(
    resolveIdentityParameters(identity, mappingParameters),
  );
}
