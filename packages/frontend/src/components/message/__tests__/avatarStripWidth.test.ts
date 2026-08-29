import {
  AVATAR_STRIP_MIN_WIDTH,
  clampAvatarStripWidth,
  DEFAULT_AVATAR_ASPECT,
  optimalAvatarStripWidth,
} from "../avatarStripWidth";

describe("optimalAvatarStripWidth", () => {
  it("sizes the strip so height is the limiting contain-fit axis", () => {
    expect(optimalAvatarStripWidth(1000, 1600, 0.5)).toBe(500);
  });

  it("uses the standing-figure fallback aspect", () => {
    expect(optimalAvatarStripWidth(1000, 1600)).toBe(
      Math.round(1000 * DEFAULT_AVATAR_ASPECT),
    );
  });

  it("does not steal more than half the pane", () => {
    expect(optimalAvatarStripWidth(1000, 600, 0.9)).toBe(
      Math.round(600 * 0.55),
    );
  });

  it("never shrinks below the minimum width", () => {
    expect(optimalAvatarStripWidth(100, 1600, 0.3)).toBe(
      AVATAR_STRIP_MIN_WIDTH,
    );
  });
});

describe("clampAvatarStripWidth", () => {
  it("clamps a dragged width into the allowed range", () => {
    expect(clampAvatarStripWidth(40, 1000)).toBe(AVATAR_STRIP_MIN_WIDTH);
    expect(clampAvatarStripWidth(900, 1000)).toBe(550);
    expect(clampAvatarStripWidth(320, 1000)).toBe(320);
  });
});
