import {
  AVATAR_IDENTITIES,
  DEFAULT_AVATAR_IDENTITY_ID,
  SHARED_AVATAR_MESH,
  SHIPPED_MELODY_ATLAS,
  applyAvatarIdentity,
  applyIdentityLook,
  defaultAtlasForIdentity,
  lookForAvatarIdentity,
  resolveAvatarIdentity,
  resolveIdentityOverlay,
  resolveIdentityParameters,
  resolveIdentityRig,
} from "../avatar-identities";

describe("avatar identities", () => {
  it("defaults unknown identities to Miara", () => {
    expect(resolveAvatarIdentity(undefined)).toBe(DEFAULT_AVATAR_IDENTITY_ID);
    expect(resolveAvatarIdentity("not-real")).toBe(DEFAULT_AVATAR_IDENTITY_ID);
  });

  it("gives each identity its own Cubism model package", () => {
    expect(AVATAR_IDENTITIES).toHaveLength(3);
    expect(AVATAR_IDENTITIES.map((identity) => identity.model)).toEqual([
      "miara",
      "deep-tree-echo",
      "melody",
    ]);
    expect(SHARED_AVATAR_MESH).toBe("miara");
  });

  it("applies grove look for Deep Tree Echo", () => {
    const applied = applyAvatarIdentity("deep-tree-echo");
    expect(applied.identity).toBe("deep-tree-echo");
    expect(applied.model).toBe("deep-tree-echo");
    expect(applied.outfit.id).toBe("grove");
    expect(applied.outfit.hueShift).toBe(0);
    expect(applied.outfit.hiddenGroups).toEqual([]);
    expect(lookForAvatarIdentity("deep-tree-echo").id).toBe("grove");
  });

  it("applies aria look for Melody", () => {
    const applied = applyAvatarIdentity("melody");
    expect(applied.identity).toBe("melody");
    expect(applied.model).toBe("melody");
    expect(applied.outfit.id).toBe("aria");
    expect(applied.outfit.hueShift).toBe(0);
    expect(applied.overlay).toBe(SHIPPED_MELODY_ATLAS);
    expect(applied.outfit.hiddenGroups).toEqual(
      expect.arrayContaining(["water", "background", "chestCloth"]),
    );
    expect(applied.rig?.id).toBe("melody");
    expect(lookForAvatarIdentity("melody").hueShift).toBe(325);
  });

  it("resolves a grove shape and physics rig for Deep Tree Echo", () => {
    const applied = applyAvatarIdentity("deep-tree-echo");
    expect(applied.rig?.id).toBe("deep-tree-echo");
    expect(
      applied.rig?.deform.bands.some((band) => band.id === "grove-wings"),
    ).toBe(true);
    expect(resolveIdentityRig("miara")).toBeNull();
    expect(resolveIdentityRig("melody")?.physics.id).toBe("melody");
  });

  it("binds the shipped Melody atlas unless a custom overlay is set", () => {
    expect(defaultAtlasForIdentity("miara")).toBeNull();
    expect(defaultAtlasForIdentity("deep-tree-echo")).toBeNull();
    expect(defaultAtlasForIdentity("melody")).toBe(SHIPPED_MELODY_ATLAS);
    expect(resolveIdentityOverlay("melody", null)).toBeNull();
    expect(resolveIdentityOverlay("melody", "data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
    expect(resolveIdentityOverlay("miara", SHIPPED_MELODY_ATLAS)).toBeNull();
    expect(resolveIdentityParameters("melody")?.ParamMouthForm).toBe(0.45);
    expect(resolveIdentityParameters("miara")).toBeNull();
  });

  it("binds overlay, parameters, and rig together when applying a look", () => {
    const controller = {
      applyTextureOverlay: jest.fn().mockResolvedValue(true),
      clearTextureOverlay: jest.fn().mockResolvedValue(true),
      applyParameterProfile: jest.fn(),
      applyIdentityRig: jest.fn(),
    };
    applyIdentityLook(controller, "melody");
    expect(controller.applyIdentityRig).toHaveBeenCalledWith(
      expect.objectContaining({ id: "melody" }),
    );
    expect(controller.applyTextureOverlay).not.toHaveBeenCalled();
    expect(controller.clearTextureOverlay).toHaveBeenCalled();
    expect(controller.applyParameterProfile).toHaveBeenCalled();

    applyIdentityLook(controller, "melody", "data:image/png;base64,abc");
    expect(controller.applyTextureOverlay).toHaveBeenCalledWith(
      "data:image/png;base64,abc",
    );

    applyIdentityLook(controller, "miara");
    expect(controller.applyIdentityRig).toHaveBeenCalledWith(null);
  });
});
