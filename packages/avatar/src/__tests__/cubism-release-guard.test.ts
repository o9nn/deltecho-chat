import { guardCubismRendererRelease } from "../adapters/cubism-release-guard.js";

describe("Cubism no-mask release guard", () => {
  it("releases each actual buffer exactly once and clears references without a clipping manager", () => {
    const buffers = [{ name: "vertex" }, { name: "uv" }, { name: "index" }];
    const deleted: unknown[] = [];
    let originalCalls = 0;
    const renderer = {
      _bufferData: { vertex: buffers[0], uv: buffers[1], index: buffers[2] } as
        | { vertex: unknown; uv: unknown; index: unknown }
        | undefined,
      _textures: { texture: 1 } as unknown,
      gl: {
        deleteBuffer: (b: unknown) => {
          deleted.push(b);
        },
      },
      release: () => {
        originalCalls++;
        throw new Error("missing clipping manager");
      },
    };
    expect(guardCubismRendererRelease(renderer)).toBe(true);
    expect(guardCubismRendererRelease(renderer)).toBe(true);
    renderer.release();
    renderer.release();
    expect(deleted).toEqual(buffers);
    expect(originalCalls).toBe(0);
    expect(renderer._bufferData).toBeUndefined();
    expect(renderer._textures).toBeUndefined();
  });
  it("delegates unchanged to the installed renderer for masked models", () => {
    let count = 0;
    const renderer = {
      _clippingManager: { release: () => {} },
      _bufferData: { vertex: null, uv: null, index: null },
      release() {
        expect(this).toBe(renderer);
        count++;
      },
    };
    expect(guardCubismRendererRelease(renderer)).toBe(true);
    renderer.release();
    renderer.release();
    expect(count).toBe(1);
  });
  it("cleans an initialized renderer without GL allocations and rejects unsupported surfaces", () => {
    const renderer = {
      _bufferData: { vertex: null, uv: null, index: null },
      release: () => {
        throw new Error("no mask");
      },
    };
    expect(guardCubismRendererRelease(renderer)).toBe(true);
    expect(() => renderer.release()).not.toThrow();
    expect(guardCubismRendererRelease(null)).toBe(false);
    expect(guardCubismRendererRelease({ release: () => {} })).toBe(false);
    expect(
      guardCubismRendererRelease({ _bufferData: {}, release: () => {} }),
    ).toBe(false);
  });
});
