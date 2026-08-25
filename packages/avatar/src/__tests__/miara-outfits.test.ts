import {
  ALL_MIARA_WARDROBE_PART_IDS,
  DEFAULT_MIARA_OUTFIT_ID,
  MIARA_OUTFIT_PRESETS,
  collectHiddenPartIds,
  isMiaraOutfitId,
  outfitFromCustomAdjustments,
  partIdMatchesHiddenGroups,
  resolveMiaraOutfit,
} from "../miara-outfits";

describe("miara outfits", () => {
  it("defaults unknown outfits to official", () => {
    expect(resolveMiaraOutfit(undefined).id).toBe(DEFAULT_MIARA_OUTFIT_ID);
    expect(resolveMiaraOutfit({ id: "not-real" as never }).id).toBe(
      DEFAULT_MIARA_OUTFIT_ID,
    );
  });

  it("resolves official with every wardrobe part visible", () => {
    const official = resolveMiaraOutfit({ id: "official" });
    expect(official.hiddenGroups).toEqual([]);
    expect(official.hueShift).toBe(0);
    expect(collectHiddenPartIds(official.hiddenGroups)).toEqual([]);
  });

  it("hides fairy and water layers for casual", () => {
    const casual = resolveMiaraOutfit({ id: "casual" });
    const hidden = collectHiddenPartIds(casual.hiddenGroups);
    expect(hidden).toEqual(
      expect.arrayContaining([
        "PartFairy",
        "PartHairAccFront",
        "PartSparkle",
        "PartWaterSurface",
        "PartBackground",
      ]),
    );
    expect(hidden).not.toEqual(
      expect.arrayContaining(["PartChestClothLRotation"]),
    );
  });

  it("applies rose clothing colorway without hiding official layers", () => {
    const rose = resolveMiaraOutfit({ id: "rose" });
    expect(rose.hiddenGroups).toEqual([]);
    expect(rose.hueShift).toBe(310);
  });

  it("applies grove and aria identity colorways on the same mesh", () => {
    const grove = resolveMiaraOutfit({ id: "grove" });
    expect(grove.hiddenGroups).toEqual([]);
    expect(grove.hueShift).toBe(95);
    const aria = resolveMiaraOutfit({ id: "aria" });
    expect(aria.hueShift).toBe(325);
    expect(aria.hiddenGroups).toEqual(
      expect.arrayContaining(["water", "background"]),
    );
  });

  it("keeps custom hidden groups and hue", () => {
    const custom = resolveMiaraOutfit({
      id: "custom",
      hiddenGroups: ["sparkle", "not-a-group" as never],
      hueShift: 400,
    });
    expect(custom.id).toBe("custom");
    expect(custom.hiddenGroups).toEqual(["sparkle"]);
    expect(custom.hueShift).toBe(40);
  });

  it("collapses custom adjustments back onto a matching preset", () => {
    const fairy = MIARA_OUTFIT_PRESETS.find((preset) => preset.id === "fairy");
    expect(fairy).toBeDefined();
    expect(
      outfitFromCustomAdjustments({
        hiddenGroups: [...(fairy?.hiddenGroups ?? [])],
        hueShift: fairy?.hueShift ?? 0,
      }).id,
    ).toBe("fairy");
  });

  it("exports unique wardrobe part ids", () => {
    expect(ALL_MIARA_WARDROBE_PART_IDS.length).toBeGreaterThan(10);
    expect(new Set(ALL_MIARA_WARDROBE_PART_IDS).size).toBe(
      ALL_MIARA_WARDROBE_PART_IDS.length,
    );
  });

  it("matches live Cubism part ids for hidden wardrobe groups", () => {
    expect(partIdMatchesHiddenGroups("PartFairyUpperWingL", ["fairy"])).toBe(
      true,
    );
    expect(partIdMatchesHiddenGroups("PartWaterSurfaceBack", ["water"])).toBe(
      true,
    );
    expect(partIdMatchesHiddenGroups("PartFace", ["fairy"])).toBe(false);
  });

  it("accepts only catalog outfit ids", () => {
    expect(isMiaraOutfitId("official")).toBe(true);
    expect(isMiaraOutfitId("custom")).toBe(true);
    expect(isMiaraOutfitId("school")).toBe(false);
  });
});
