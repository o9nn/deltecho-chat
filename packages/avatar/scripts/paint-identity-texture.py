#!/usr/bin/env python3
"""Recast official Miara UV islands toward Melody using mesh-map.json.

Keeps official alpha so Cubism islands stay filled. Does not paste the
sparse automesh atlas (that overlay is what shattered the live mesh).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


# Melody still: purple hair, gold headset, silver crop, black skirt, skin, pink wings.
REGION_FALLBACK = {
    "hair": (148, 72, 198),
    "headset": (228, 168, 48),
    "face": (236, 188, 168),
    "body": (198, 206, 214),
    "chestCloth": (20, 20, 24),
    "skirt": (18, 16, 24),
    "arms": (236, 186, 164),
    "legs": (228, 178, 156),
    "wings": (232, 176, 214),
    "sparkle": (255, 220, 120),
    "accessory": (210, 168, 72),
}

REGION_STRENGTH = {
    "hair": 0.9,
    "headset": 0.92,
    "face": 0.32,
    "body": 0.86,
    "chestCloth": 0.4,
    "skirt": 0.92,
    "arms": 0.42,
    "legs": 0.48,
    "wings": 0.84,
    "sparkle": 0.55,
    "accessory": 0.75,
}

SKIP_REGIONS = {"environment"}
REPLACE_REGIONS = {"skirt", "chestCloth", "headset"}
PAINT_ORDER = [
    "body",
    "arms",
    "legs",
    "face",
    "hair",
    "wings",
    "sparkle",
    "accessory",
    "skirt",
    "headset",
]
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def still_region_targets(still: Image.Image) -> dict[str, tuple[int, int, int]]:
    arr = np.asarray(still.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[..., :3].astype(np.int16)
    alpha = arr[..., 3]
    yy, xx = np.indices((h, w))
    nx = xx / max(w - 1, 1)
    ny = yy / max(h - 1, 1)
    opaque = alpha > 16
    bands = {
        "hair": opaque & (ny < 0.2) & (np.abs(nx - 0.5) < 0.28),
        "headset": opaque & (ny > 0.1) & (ny < 0.22) & (np.abs(nx - 0.5) > 0.1) & (np.abs(nx - 0.5) < 0.28),
        "face": opaque & (ny > 0.1) & (ny < 0.24) & (np.abs(nx - 0.5) < 0.1),
        "body": opaque & (ny > 0.24) & (ny < 0.4) & (np.abs(nx - 0.5) < 0.16),
        "skirt": opaque & (ny > 0.4) & (ny < 0.52) & (np.abs(nx - 0.5) < 0.18),
        "arms": opaque & (ny > 0.26) & (ny < 0.48) & (np.abs(nx - 0.5) > 0.16) & (np.abs(nx - 0.5) < 0.32),
        "legs": opaque & (ny > 0.52) & (ny < 0.88) & (np.abs(nx - 0.5) < 0.18),
        "wings": opaque & (ny > 0.22) & (ny < 0.62) & (np.abs(nx - 0.5) > 0.22),
    }
    targets = dict(REGION_FALLBACK)
    for region, mask in bands.items():
        if int(mask.sum()) < 40:
            continue
        sample = rgb[mask]
        targets[region] = tuple(int(v) for v in np.median(sample, axis=0))
    return targets


def recast_aabb(
    arr: np.ndarray,
    uv: dict,
    target: tuple[int, int, int],
    strength: float,
    boost_teal: bool,
    mode: str = "luminance",
) -> int:
    height, width = arr.shape[:2]
    x0 = max(0, int(uv.get("x", 0) * width))
    y0 = max(0, int(uv.get("y", 0) * height))
    x1 = min(width, int((uv.get("x", 0) + uv.get("w", 0)) * width) + 1)
    y1 = min(height, int((uv.get("y", 0) + uv.get("h", 0)) * height) + 1)
    if x1 <= x0 or y1 <= y0:
        return 0
    patch = arr[y0:y1, x0:x1]
    alpha = patch[..., 3]
    mask = alpha >= 16
    if not np.any(mask):
        return 0
    rgb = patch[..., :3].astype(np.float32)
    target_arr = np.asarray(target, dtype=np.float32)
    if mode == "replace":
        recast = np.broadcast_to(target_arr, rgb.shape)
        mix = strength
    else:
        lum = rgb @ LUMA
        target_lum = max(float(target_arr @ LUMA), 1.0)
        recast = np.clip(target_arr * (lum[:, :, None] / target_lum), 0, 255)
        mix = strength
        if boost_teal:
            teal = (
                (rgb[..., 1] > rgb[..., 0] + 12)
                & (rgb[..., 2] > rgb[..., 0])
                & (rgb[..., 1] > 70)
            )
            mix = np.where(teal[..., None], max(strength, 0.94), strength)
    mixed = rgb + (recast - rgb) * mix
    patch[..., :3][mask] = mixed[mask].astype(np.uint8)
    return int(mask.sum())


def texture_stats(arr: np.ndarray) -> dict:
    rgb = arr[..., :3].astype(np.int16)
    alpha = arr[..., 3]
    opaque = alpha > 16
    sample = rgb[opaque]
    if sample.size == 0:
        return {"opaque": 0, "mean": [0, 0, 0], "purple": 0, "teal": 0, "gold": 0}
    mean = [int(v) for v in sample.mean(axis=0)]
    r, g, b = sample[:, 0], sample[:, 1], sample[:, 2]
    purple = int(((r > 70) & (b > 90) & (g < r * 0.95) & (b > g * 0.8)).sum())
    teal = int(((g > r + 8) & (g > 90) & (b > r) & (b > 70)).sum())
    gold = int(((r > 160) & (g > 80) & (g < 200) & (b < 90)).sum())
    return {
        "opaque": int(opaque.sum()),
        "mean": mean,
        "purple": purple,
        "teal": teal,
        "gold": gold,
    }


def paint_melody(
    official_path: Path,
    still_path: Path,
    atlas_path: Path | None,
    mesh_map_path: Path,
    dest: Path,
) -> int:
    del atlas_path  # sparse atlas overlay shatters the live mesh
    mesh_map = json.loads(mesh_map_path.read_text())
    official = Image.open(official_path).convert("RGBA")
    still = Image.open(still_path).convert("RGBA")
    targets = still_region_targets(still)
    # Headset still-band often samples purple hair. Keep gold cups.
    targets["headset"] = REGION_FALLBACK["headset"]
    targets["skirt"] = REGION_FALLBACK["skirt"]
    arr = np.array(official)
    painted = 0
    by_region: dict[str, list] = {region: [] for region in PAINT_ORDER}
    for drawable in mesh_map.get("drawables", []):
        region = drawable.get("region")
        if region in SKIP_REGIONS or region not in by_region:
            continue
        by_region[region].append(drawable)
    for region in PAINT_ORDER:
        for drawable in by_region[region]:
            uv = drawable.get("uv") or {}
            if uv.get("w", 0) <= 0 or uv.get("h", 0) <= 0:
                continue
            painted += recast_aabb(
                arr,
                uv,
                targets.get(region, REGION_FALLBACK.get(region, (128, 128, 128))),
                REGION_STRENGTH.get(region, 0.6),
                boost_teal=region in {"hair", "wings", "body"},
                mode="replace" if region in REPLACE_REGIONS else "luminance",
            )
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(dest, optimize=True)
    stats = texture_stats(arr)
    stats["painted"] = painted
    char = np.zeros(arr.shape[:2], dtype=bool)
    height, width = arr.shape[:2]
    for drawable in mesh_map.get("drawables", []):
        if drawable.get("region") in SKIP_REGIONS:
            continue
        uv = drawable.get("uv") or {}
        x0 = max(0, int(uv.get("x", 0) * width))
        y0 = max(0, int(uv.get("y", 0) * height))
        x1 = min(width, int((uv.get("x", 0) + uv.get("w", 0)) * width) + 1)
        y1 = min(height, int((uv.get("y", 0) + uv.get("h", 0)) * height) + 1)
        char[y0:y1, x0:x1] = True
    masked = arr.copy()
    masked[~char] = 0
    stats["character"] = texture_stats(masked)
    (dest.parent / "texture-stats.json").write_text(f"{json.dumps(stats, indent=2)}\n")
    return painted


def grove_recast_character(im: Image.Image, mesh_map: dict) -> None:
    arr = np.array(im)
    for drawable in mesh_map.get("drawables", []):
        if drawable.get("region") == "environment":
            continue
        recast_aabb(arr, drawable.get("uv") or {}, (72, 140, 88), 0.55, boost_teal=False)
    im.paste(Image.fromarray(arr, "RGBA"))


def paint_grove(official_path: Path, mesh_map_path: Path, dest: Path) -> None:
    official = Image.open(official_path).convert("RGBA")
    if mesh_map_path.exists():
        grove_recast_character(official, json.loads(mesh_map_path.read_text()))
    dest.parent.mkdir(parents=True, exist_ok=True)
    official.save(dest, optimize=True)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: paint-identity-texture.py melody|grove ...")
    mode = sys.argv[1]
    if mode == "melody":
        official, still, atlas, mesh_map, dest = map(Path, sys.argv[2:7])
        painted = paint_melody(
            official,
            still,
            atlas if str(atlas) != "-" else None,
            mesh_map,
            dest,
        )
        print(f"{dest.stat().st_size} {painted}")
        return
    if mode == "grove":
        official, mesh_map, dest = map(Path, sys.argv[2:5])
        paint_grove(official, mesh_map, dest)
        print(dest.stat().st_size)
        return
    raise SystemExit(f"unknown mode {mode}")


if __name__ == "__main__":
    main()
