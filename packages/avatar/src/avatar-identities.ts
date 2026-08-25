/**
 * Companion identities that share the official Miara Cubism mesh.
 *
 * There is one baked body. Identities are named looks on that mesh:
 * wardrobe presets plus a portrait used by the picker.
 */

import { MELODY_PARAMETER_PROFILE } from "./automesh/parameters";
import { resolveIdentityRig, type IdentityRig } from "./automesh/identity-rig";
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

/** Every identity loads the same Live2D body. */
export const SHARED_AVATAR_MESH = "miara";

/** Shipped triangle-reprojected Melody atlas on the official Miara UV layout. */
export const SHIPPED_MELODY_ATLAS =
  "./images/avatar/identities/melody-atlas.png";

export interface AvatarIdentitySpec {
  id: AvatarIdentityId;
  label: string;
  description: string;
  /** Live2D preset name. Always the shared Miara mesh. */
  model: typeof SHARED_AVATAR_MESH;
  /** Wardrobe look applied when this identity is selected. */
  outfitId: Exclude<MiaraOutfitId, "custom">;
  /** Picker portrait, relative to the app html root. */
  portrait?: string;
  /** Optional remapped Cubism atlas bound when this identity is selected. */
  overlay?: string;
  /** Extra wardrobe hides that stay on even when the named preset is applied. */
  extraHiddenGroups?: readonly MiaraPartGroup[];
}

export const AVATAR_IDENTITIES: readonly AvatarIdentitySpec[] = [
  {
    id: "miara",
    label: "Miara",
    description: "Official baked mesh and lagoon fairy look.",
    model: SHARED_AVATAR_MESH,
    outfitId: "official",
  },
  {
    id: "deep-tree-echo",
    label: "Deep Tree Echo",
    description:
      "Same body mesh, converged toward grove consciousness — moss color, living wings, bioluminescent lagoon.",
    model: SHARED_AVATAR_MESH,
    outfitId: "grove",
    portrait: "./images/avatar/identities/deep-tree-echo.webp",
  },
  {
    id: "melody",
    label: "Melody",
    description:
      "Same body mesh, converged to the Melody still — remapped atlas, crop silhouette, headset motion, no water stage.",
    model: SHARED_AVATAR_MESH,
    outfitId: "aria",
    portrait: "./images/avatar/identities/melody.webp",
    overlay: SHIPPED_MELODY_ATLAS,
    extraHiddenGroups: ["chestCloth"],
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
  model: typeof SHARED_AVATAR_MESH;
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
    // Remapped atlases already carry Melody color; do not hue-rotate them.
    outfit: spec.overlay
      ? { ...outfit, hiddenGroups, hueShift: 0 }
      : { ...outfit, hiddenGroups },
    overlay: spec.overlay ?? null,
    rig: resolveIdentityRig(spec.id),
  };
}

export { resolveIdentityRig };
export type { IdentityRig };

export function defaultAtlasForIdentity(id: unknown): string | null {
  return getAvatarIdentity(id).overlay ?? null;
}

/** Custom trained atlas wins; otherwise the identity's shipped overlay. */
export function resolveIdentityOverlay(
  identity: unknown,
  customAtlas?: string | null,
): string | null {
  if (resolveAvatarIdentity(identity) !== "melody") return null;
  if (typeof customAtlas === "string" && customAtlas.length > 0) {
    return customAtlas;
  }
  return defaultAtlasForIdentity(identity);
}

export function resolveIdentityParameters(
  identity: unknown,
  mappingParameters?: Record<string, number> | null,
): Record<string, number> | null {
  if (resolveAvatarIdentity(identity) !== "melody") return null;
  if (mappingParameters && Object.keys(mappingParameters).length > 0) {
    return mappingParameters;
  }
  return { ...MELODY_PARAMETER_PROFILE };
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
    controller.applyParameterProfile?.(
      resolveIdentityParameters(identity, mappingParameters),
    );
    return;
  }
  void controller.clearTextureOverlay?.();
}
