import React, { useMemo, useRef, useState } from "react";
import {
  cloneMelodyLandmarks,
  projectPhotoOntoAtlas,
  rasterToDataUrl,
  trainAutomeshMapping,
  warpRasterToAtlas,
  type AutomeshLandmark,
  type AutomeshRaster,
} from "@deltecho/avatar";
import useTranslationFunction from "../../hooks/useTranslationFunction";
import { useDeepTreeEchoAvatarOptional } from "./DeepTreeEchoAvatarContext";

const ATLAS_SIZE = 1024;

function imageToRaster(image: HTMLImageElement): AutomeshRaster {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return { width: 1, height: 1, data: new Uint8ClampedArray(4) };
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data,
  };
}

export function AutomeshStudio() {
  const tx = useTranslationFunction();
  const avatar = useDeepTreeEchoAvatarOptional();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [landmarks, setLandmarks] = useState<AutomeshLandmark[]>(() =>
    cloneMelodyLandmarks(),
  );
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const savedResidual = avatar?.state.config.automeshMapping?.residual;

  const previewLandmarks = useMemo(() => landmarks, [landmarks]);

  const moveLandmark = (id: string, source: { x: number; y: number }) => {
    setLandmarks((current) =>
      current.map((item) =>
        item.id === id ? { ...item, source } : item,
      ),
    );
  };

  const loadImageUrl = (url: string) => {
    setImageUrl(url);
    const image = new Image();
    image.onload = () => setImageEl(image);
    image.src = url;
    setStatus(tx("automesh_status_loaded"));
  };

  const loadFile = (file: File) => {
    loadImageUrl(URL.createObjectURL(file));
  };

  const loadShippedMelody = () => {
    loadImageUrl("./images/avatar/identities/melody.webp");
  };

  const inspectLiveMesh = () => {
    const drawables = avatar?.controller?.inspectMesh?.() ?? [];
    if (drawables.length === 0) {
      setStatus(tx("automesh_status_no_mesh"));
      return;
    }
    const mapping = trainAutomeshMapping({
      identity: "melody",
      landmarks,
      drawables,
    });
    setLandmarks(mapping.landmarks);
    setStatus(
      `${tx("automesh_status_inspected")} ${drawables.length} · residual ${
        mapping.residual.toFixed(4)
      }`,
    );
  };

  const trainAndApply = async () => {
    if (!imageEl) {
      setStatus(tx("automesh_status_need_image"));
      return;
    }
    setBusy(true);
    try {
      const drawables = avatar?.controller?.inspectMesh?.() ?? [];
      const mapping = trainAutomeshMapping({
        identity: "melody",
        landmarks,
        drawables,
      });
      const raster = imageToRaster(imageEl);
      const hasTriangles = drawables.some(
        (item) => (item.indices?.length ?? 0) >= 3,
      );
      const atlas = hasTriangles
        ? projectPhotoOntoAtlas({
            photo: raster,
            drawables,
            landmarks: mapping.landmarks,
            atlasWidth: ATLAS_SIZE,
            atlasHeight: ATLAS_SIZE,
          })
        : warpRasterToAtlas(
            raster,
            mapping.landmarks,
            ATLAS_SIZE,
            ATLAS_SIZE,
          );
      const atlasUrl = rasterToDataUrl(atlas);
      avatar?.updateConfig({
        identity: "melody",
        outfit: "aria",
        outfitHueShift: 0,
        automeshMapping: mapping,
        automeshAtlas: atlasUrl,
      });
      const applied = await avatar?.controller?.applyTextureOverlay?.(atlasUrl);
      avatar?.controller?.applyParameterProfile?.(mapping.parameters ?? null);
      setLandmarks(mapping.landmarks);
      setStatus(
        applied
          ? `${tx("automesh_status_applied")} residual ${mapping.residual.toFixed(4)}`
          : tx("automesh_status_saved"),
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : tx("automesh_status_failed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="automesh-studio" data-testid="automesh-studio">
      <h3>{tx("automesh_title")}</h3>
      <p>{tx("automesh_blurb")}</p>
      <div className="automesh-studio__actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          data-testid="automesh-file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) loadFile(file);
          }}
        />
        <button
          type="button"
          data-testid="automesh-load"
          onClick={() => fileRef.current?.click()}
        >
          {tx("automesh_load")}
        </button>
        <button
          type="button"
          data-testid="automesh-load-melody"
          onClick={loadShippedMelody}
        >
          {tx("automesh_load_melody")}
        </button>
        <button
          type="button"
          data-testid="automesh-inspect"
          onClick={inspectLiveMesh}
        >
          {tx("automesh_inspect")}
        </button>
        <button
          type="button"
          data-testid="automesh-train"
          disabled={busy}
          onClick={() => void trainAndApply()}
        >
          {tx("automesh_train")}
        </button>
      </div>
      {status && (
        <p className="automesh-studio__status" data-testid="automesh-status">
          {status}
        </p>
      )}
      {typeof savedResidual === "number" && (
        <p data-testid="automesh-saved-residual">
          {tx("automesh_saved_residual")} {savedResidual.toFixed(4)}
        </p>
      )}
      {imageUrl && (
        <div
          className="automesh-studio__stage"
          data-testid="automesh-stage"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const source = {
              x: (event.clientX - rect.left) / rect.width,
              y: (event.clientY - rect.top) / rect.height,
            };
            const nearest = previewLandmarks.reduce((best, item) => {
              const dx = item.source.x - source.x;
              const dy = item.source.y - source.y;
              const distance = dx * dx + dy * dy;
              return distance < best.distance ? { item, distance } : best;
            }, { item: previewLandmarks[0], distance: Number.POSITIVE_INFINITY });
            if (nearest.item) moveLandmark(nearest.item.id, source);
          }}
        >
          <img src={imageUrl} alt="" />
          {previewLandmarks.map((landmark) => (
            <span
              key={landmark.id}
              className="automesh-studio__pin"
              data-testid={`automesh-pin-${landmark.id}`}
              style={{
                left: `${landmark.source.x * 100}%`,
                top: `${landmark.source.y * 100}%`,
              }}
              title={landmark.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AutomeshStudio;
