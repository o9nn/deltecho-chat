import {
  AVATAR_IDENTITIES,
  DEFAULT_AVATAR_IDENTITY_ID,
  SHARED_AVATAR_MESH,
  SHIPPED_MELODY_ATLAS,
  applyAvatarIdentity,
  defaultAtlasForIdentity,
  lookForAvatarIdentity,
  resolveAvatarIdentity,
  resolveIdentityOverlay,
  resolveIdentityParameters,
} from "../avatar-identities";

describe("avatar identities", () => {
  it("defaults unknown identities to Miara", () => {
    expect(resolveAvatarIdentity(undefined)).toBe(DEFAULT_AVATAR_IDENTITY_ID);
    expect(resolveAvatarIdentity("not-real")).toBe(DEFAULT_AVATAR_IDENTITY_ID);
  });

  it("keeps every identity on the shared Miara mesh", () => {
    expect(AVATAR_IDENTITIES).toHaveLength(3);
    for (const identity of AVATAR_IDENTITIES) {
      expect(identity.model).toBe(SHARED_AVATAR_MESH);
    }
  });

  it("applies grove look for Deep Tree Echo", () => {
    const applied = applyAvatarIdentity("deep-tree-echo");
    expect(applied.identity).toBe("deep-tree-echo");
    expect(applied.model).toBe("miara");
    expect(applied.outfit.id).toBe("grove");
    expect(applied.outfit.hueShift).toBe(95);
    expect(applied.outfit.hiddenGroups).toEqual([]);
    expect(lookForAvatarIdentity("deep-tree-echo").id).toBe("grove");
  });

  it("applies aria look for Melody", () => {
    const applied = applyAvatarIdentity("melody");
    expect(applied.identity).toBe("melody");
    expect(applied.model).toBe("miara");
    expect(applied.outfit.id).toBe("aria");
    expect(applied.outfit.hueShift).toBe(0);
    expect(applied.overlay).toBe(SHIPPED_MELODY_ATLAS);
    expect(applied.outfit.hiddenGroups).toEqual(
      expect.arrayContaining(["water", "background"]),
    );
    expect(lookForAvatarIdentity("melody").hueShift).toBe(325);
  });

  it("binds the shipped Melody atlas unless a custom overlay is set", () => {
    expect(defaultAtlasForIdentity("miara")).toBeNull();
    expect(defaultAtlasForIdentity("deep-tree-echo")).toBeNull();
    expect(defaultAtlasForIdentity("melody")).toBe(SHIPPED_MELODY_ATLAS);
    expect(resolveIdentityOverlay("melody", null)).toBe(SHIPPED_MELODY_ATLAS);
    expect(resolveIdentityOverlay("melody", "data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
    expect(resolveIdentityOverlay("miara", SHIPPED_MELODY_ATLAS)).toBeNull();
    expect(resolveIdentityParameters("melody")?.ParamMouthForm).toBe(0.45);
    expect(resolveIdentityParameters("miara")).toBeNull();
  });
});
