/**
 * Companion identities that share the official Miara Cubism mesh.
 *
 * There is one baked body. Identities are named looks on that mesh:
 * wardrobe presets plus a portrait used by the picker.
 */

import {
  resolveMiaraOutfit,
  type MiaraOutfitId,
  type MiaraOutfitState,
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
      "Same body mesh, iterated toward grove consciousness — moss color, living wings, bioluminescent lagoon.",
    model: SHARED_AVATAR_MESH,
    outfitId: "grove",
    portrait: "./images/avatar/identities/deep-tree-echo.webp",
  },
  {
    id: "melody",
    label: "Melody",
    description:
      "Same body mesh, iterated toward harmonic muse — iridescent color, sparkle wings, no water stage.",
    model: SHARED_AVATAR_MESH,
    outfitId: "aria",
    portrait: "./images/avatar/identities/melody.webp",
  },
];

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
} {
  const spec = getAvatarIdentity(id);
  return {
    identity: spec.id,
    model: spec.model,
    outfit: resolveMiaraOutfit({ id: spec.outfitId }),
  };
}
