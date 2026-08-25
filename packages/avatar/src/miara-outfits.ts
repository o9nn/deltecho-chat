/**
 * Miara wardrobe catalog.
 *
 * The official Cubism model is a single baked dress. Outfits are real
 * visual swaps: Cubism part opacity for accessory / environment layers,
 * plus a hue shift so clothing colorways actually change on the avatar.
 */

export const MIARA_OUTFIT_IDS = [
  "official",
  "casual",
  "lagoon",
  "fairy",
  "unadorned",
  "rose",
  "midnight",
  "gold",
  "custom",
] as const;

export type MiaraOutfitId = (typeof MIARA_OUTFIT_IDS)[number];

export const DEFAULT_MIARA_OUTFIT_ID: MiaraOutfitId = "official";

export const MIARA_PART_GROUPS = [
  "fairy",
  "hairAccessory",
  "chestCloth",
  "sparkle",
  "water",
  "background",
] as const;

export type MiaraPartGroup = (typeof MIARA_PART_GROUPS)[number];

export const MIARA_PART_GROUP_IDS: Record<MiaraPartGroup, readonly string[]> = {
  fairy: [
    "PartFairy",
    "PartFairyBody",
    "PartFairyUpperWingL",
    "PartFairyLowerWingL",
    "PartFairyUpperWingR",
    "PartFairyLowerWingR",
    "ArtMesh109_Skinning",
    "PartWingBackLRotation",
    "ArtMesh108_Skinning",
    "PartWingBackRRotation",
    "ArtMesh179_Skinning",
    "PartWingL2Rotation",
    "ArtMesh181_Skinning",
    "PartWingR2Rotation",
  ],
  hairAccessory: ["PartHairAccFront"],
  chestCloth: [
    "ArtMesh76_Skinning",
    "PartChestClothLRotation",
    "ArtMesh77_Skinning",
    "PartChestClothRRotation",
  ],
  sparkle: ["PartSparkle"],
  water: [
    "PartWaterSurface",
    "PartWaterSurfaceUpper",
    "PartWaterSurfaceBack",
    "PartWaterSurfaceUnder",
    "PartWaterSurfaceReflection",
  ],
  background: ["PartBackgroundAll", "PartBackground"],
};

export const ALL_MIARA_WARDROBE_PART_IDS: readonly string[] = Array.from(
  new Set(Object.values(MIARA_PART_GROUP_IDS).flat()),
);

export interface MiaraOutfitSpec {
  id: Exclude<MiaraOutfitId, "custom">;
  label: string;
  description: string;
  hiddenGroups: readonly MiaraPartGroup[];
  hueShift: number;
}

export interface MiaraOutfitState {
  id: MiaraOutfitId;
  hiddenGroups: readonly MiaraPartGroup[];
  hueShift: number;
}

export const MIARA_OUTFIT_PRESETS: readonly MiaraOutfitSpec[] = [
  {
    id: "official",
    label: "Official",
    description: "Baked Miara Pro look with fairy wings and lagoon.",
    hiddenGroups: [],
    hueShift: 0,
  },
  {
    id: "casual",
    label: "Casual",
    description: "Dress only — hide wings, sparkle, water, and hair clip.",
    hiddenGroups: ["fairy", "hairAccessory", "sparkle", "water", "background"],
    hueShift: 0,
  },
  {
    id: "lagoon",
    label: "Lagoon",
    description: "Water backdrop without fairy wings.",
    hiddenGroups: ["fairy", "hairAccessory", "sparkle"],
    hueShift: 0,
  },
  {
    id: "fairy",
    label: "Fairy",
    description: "Wings and hair clip, no water stage.",
    hiddenGroups: ["water", "background", "sparkle"],
    hueShift: 0,
  },
  {
    id: "unadorned",
    label: "Unadorned",
    description: "Plain dress with every accessory layer off.",
    hiddenGroups: MIARA_PART_GROUPS,
    hueShift: 0,
  },
  {
    id: "rose",
    label: "Rose",
    description: "Official layers with a rose clothing colorway.",
    hiddenGroups: [],
    hueShift: 310,
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Official layers with a cool clothing colorway.",
    hiddenGroups: [],
    hueShift: 210,
  },
  {
    id: "gold",
    label: "Gold",
    description: "Official layers with a warm gold clothing colorway.",
    hiddenGroups: [],
    hueShift: 45,
  },
];

export function isMiaraOutfitId(value: unknown): value is MiaraOutfitId {
  return (
    typeof value === "string" &&
    (MIARA_OUTFIT_IDS as readonly string[]).includes(value)
  );
}

export function isMiaraPartGroup(value: unknown): value is MiaraPartGroup {
  return (
    typeof value === "string" &&
    (MIARA_PART_GROUPS as readonly string[]).includes(value)
  );
}

export function getMiaraOutfitPreset(
  id: MiaraOutfitId,
): MiaraOutfitSpec | undefined {
  return MIARA_OUTFIT_PRESETS.find((preset) => preset.id === id);
}

export function collectHiddenPartIds(
  hiddenGroups: readonly MiaraPartGroup[],
): string[] {
  const ids = new Set<string>();
  for (const group of hiddenGroups) {
    for (const partId of MIARA_PART_GROUP_IDS[group]) {
      ids.add(partId);
    }
  }
  return Array.from(ids);
}

function sanitizeHiddenGroups(
  groups: readonly unknown[] | undefined,
): MiaraPartGroup[] {
  if (!Array.isArray(groups)) return [];
  return groups.filter(isMiaraPartGroup);
}

function sanitizeHueShift(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const wrapped = ((Math.round(value) % 360) + 360) % 360;
  return wrapped;
}

export function resolveMiaraOutfit(
  state: Partial<MiaraOutfitState> | null | undefined,
): MiaraOutfitState {
  const id = isMiaraOutfitId(state?.id) ? state.id : DEFAULT_MIARA_OUTFIT_ID;
  if (id !== "custom") {
    const preset = getMiaraOutfitPreset(id);
    if (preset) {
      return {
        id: preset.id,
        hiddenGroups: [...preset.hiddenGroups],
        hueShift: preset.hueShift,
      };
    }
  }
  return {
    id: "custom",
    hiddenGroups: sanitizeHiddenGroups(state?.hiddenGroups),
    hueShift: sanitizeHueShift(state?.hueShift),
  };
}

export function outfitFromCustomAdjustments(input: {
  hiddenGroups: readonly MiaraPartGroup[];
  hueShift: number;
}): MiaraOutfitState {
  const hiddenGroups = sanitizeHiddenGroups(input.hiddenGroups);
  const hueShift = sanitizeHueShift(input.hueShift);
  const matching = MIARA_OUTFIT_PRESETS.find((preset) => {
    if (preset.hueShift !== hueShift) return false;
    if (preset.hiddenGroups.length !== hiddenGroups.length) return false;
    return preset.hiddenGroups.every((group) => hiddenGroups.includes(group));
  });
  if (matching) {
    return {
      id: matching.id,
      hiddenGroups: [...matching.hiddenGroups],
      hueShift: matching.hueShift,
    };
  }
  return {
    id: "custom",
    hiddenGroups,
    hueShift,
  };
}
