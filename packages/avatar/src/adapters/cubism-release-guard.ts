/**
 * pixi-live2d-display-lipsyncpatch 0.5.0-ls-8 calls
 * _clippingManager.release() unconditionally. Unmasked models never create that
 * manager, so destruction throws before releasing GL buffers or the native model.
 * Keep the real masked-model implementation; mirror only its three-buffer cleanup
 * for the genuine no-mask case. No synthetic masks, geometry or core data.
 */
interface ReleaseSurface {
  release: () => void;
  _clippingManager?: { release: () => void };
  _bufferData?: { vertex: unknown; uv: unknown; index: unknown };
  _textures?: unknown;
  gl?: { deleteBuffer: (buffer: unknown) => void };
}
const installed = new WeakSet<object>();
export function guardCubismRendererRelease(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const renderer = value as ReleaseSurface;
  if (
    typeof renderer.release !== "function" ||
    !renderer._bufferData ||
    !["vertex", "uv", "index"].every((k) =>
      Object.prototype.hasOwnProperty.call(renderer._bufferData, k),
    )
  )
    return false;
  if (installed.has(renderer)) return true;
  const original = renderer.release;
  let released = false;
  renderer.release = () => {
    if (released) return;
    if (renderer._clippingManager) {
      original.call(renderer);
    } else {
      const data = renderer._bufferData;
      if (!data) {
        original.call(renderer);
        return;
      }
      for (const key of ["vertex", "uv", "index"] as const) {
        if (data[key] != null) renderer.gl?.deleteBuffer(data[key]);
        data[key] = null;
      }
      renderer._bufferData = undefined;
      renderer._textures = undefined;
    }
    released = true;
  };
  installed.add(renderer);
  return true;
}
