import {
  FIGURE_BOUNDS_PAD,
  isIgnoredDrawableId,
  isScenePlaneDrawable,
  measureFigureBounds,
  measureOpaquePixelBounds,
  padFigureBounds,
} from "../adapters/live2d-figure-bounds";

describe("live2d-figure-bounds", () => {
  const canvas = { width: 800, height: 1600 };

  it("ignores water, background, and hit-area drawable ids", () => {
    expect(isIgnoredDrawableId("WaterSurface1")).toBe(true);
    expect(isIgnoredDrawableId("PartBackground")).toBe(true);
    expect(isIgnoredDrawableId("HitAreaHead")).toBe(true);
    expect(isIgnoredDrawableId("ArtMeshBody")).toBe(false);
  });

  it("treats canvas-filling planes as scene decoration", () => {
    expect(
      isScenePlaneDrawable(
        { id: "ArtMesh99", x: 0, y: 0, width: 800, height: 1600 },
        canvas,
      ),
    ).toBe(true);
    expect(
      isScenePlaneDrawable(
        { id: "ArtMesh88", x: 0, y: 1100, width: 800, height: 400 },
        canvas,
      ),
    ).toBe(true);
    expect(
      isScenePlaneDrawable(
        { id: "body", x: 200, y: 200, width: 400, height: 800 },
        canvas,
      ),
    ).toBe(false);
  });

  it("returns the character cluster instead of the water plane", () => {
    const bounds = measureFigureBounds(
      [
        { id: "body", x: 200, y: 200, width: 400, height: 800 },
        { id: "hair", x: 220, y: 160, width: 360, height: 240 },
        { id: "WaterSurface1", x: 0, y: 1000, width: 800, height: 600 },
        { id: "ArtMeshBg", x: 0, y: 0, width: 800, height: 1600 },
      ],
      canvas,
    );
    expect(bounds).toEqual({ x: 200, y: 160, width: 400, height: 840 });
  });

  it("pads the figure without changing its center", () => {
    const padded = padFigureBounds({ x: 200, y: 200, width: 400, height: 800 });
    expect(padded.width).toBeCloseTo(400 * FIGURE_BOUNDS_PAD);
    expect(padded.height).toBeCloseTo(800 * FIGURE_BOUNDS_PAD);
    expect(padded.x + padded.width / 2).toBeCloseTo(400);
    expect(padded.y + padded.height / 2).toBeCloseTo(600);
  });

  it("finds the opaque pixel box of a centered figure", () => {
    const width = 20;
    const height = 20;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 4; y <= 15; y++) {
      for (let x = 6; x <= 13; x++) {
        const i = (y * width + x) * 4;
        pixels[i + 3] = 255;
      }
    }
    expect(measureOpaquePixelBounds(pixels, width, height, 12, 1)).toEqual({
      x: 6,
      y: 4,
      width: 8,
      height: 12,
    });
  });
});
