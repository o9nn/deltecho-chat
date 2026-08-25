#!/usr/bin/env python3
"""Recast official Miara UV islands toward Melody using mesh-map.json.

Keeps official alpha so Cubism islands stay filled. Does not paste the
sparse automesh atlas (that overlay is what shattered the live mesh).

AABB paint is not enough: long hair strands have figure centroids in the
skirt/body bands, and overlapping boxes let black replace wipe purple.
Each opaque pixel is owned by the smallest covering island, then
cyan/teal official pixels are forced through the hair recast.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


# Melody still: purple hair, gold headset, silver crop, black skirt, skin, pink wings.
REGION_FALLBACK = {
    "hair": (132, 58, 186),
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

SKIP_REGIONS = {"environment"}
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def uv_aabb(
    uv: dict, width: int, height: int
) -> tuple[int, int, int, int] | None:
    x0 = max(0, int(uv.get("x", 0) * width))
    y0 = max(0, int(uv.get("y", 0) * height))
    x1 = min(width, int((uv.get("x", 0) + uv.get("w", 0)) * width) + 1)
    y1 = min(height, int((uv.get("y", 0) + uv.get("h", 0)) * height) + 1)
    if x1 <= x0 or y1 <= y0:
        return None
    return x0, y0, x1, y1


def assign_owners(arr: np.ndarray, drawables: list) -> np.ndarray:
    """Smallest opaque AABB wins so skirt boxes cannot steal hair strands."""
    height, width = arr.shape[:2]
    owner = np.full((height, width), -1, dtype=np.int32)
    owner_area = np.full((height, width), np.inf, dtype=np.float32)
    alpha = arr[..., 3]
    for index, drawable in enumerate(drawables):
        region = drawable.get("region")
        if region in SKIP_REGIONS:
            continue
        box = uv_aabb(drawable.get("uv") or {}, width, height)
        if box is None:
            continue
        x0, y0, x1, y1 = box
        area = float(max((x1 - x0) * (y1 - y0), 1))
        patch = slice(y0, y1), slice(x0, x1)
        take = (alpha[patch] >= 16) & (area < owner_area[patch])
        if not np.any(take):
            continue
        owner[patch][take] = index
        owner_area[patch][take] = area
    return owner


def hair_like(rgb: np.ndarray) -> np.ndarray:
    """Official Miara hair is pale cyan / teal, including long hanging strands."""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    cyan = (g + b) / 2 - r
    spread = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    # Near-white dress/boots are low-chroma; hair strands keep a cyan spread.
    return (cyan > 16) & (b > 80) & (g > 80) & (spread > 18)


def gold_like(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    return (r > 150) & (g > 80) & (b < r - 30) & (g < r + 25) & (b < 140)


def skin_like(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    return (
        (r > g + 6)
        & (g > b - 8)
        & (r > 140)
        & (b > 70)
        & (r - b < 95)
        & (r < 250)
    )


def chroma_toward(
    rgb: np.ndarray,
    mask: np.ndarray,
    target: tuple[int, int, int],
    luma_min: float,
    luma_span: float,
) -> None:
    """Keep island shading; compress luma so bright teal cannot wash to white."""
    if not np.any(mask):
        return
    src = rgb[mask].astype(np.float32)
    luma = src @ LUMA
    target_arr = np.asarray(target, dtype=np.float32)
    target_luma = max(float(target_arr @ LUMA), 1.0)
    out_luma = luma_min + (luma / 255.0) * luma_span
    recast = (target_arr / target_luma) * out_luma[:, None]
    rgb[mask] = np.clip(recast, 0, 255).astype(np.uint8)


def tint_toward(
    rgb: np.ndarray,
    mask: np.ndarray,
    target: tuple[int, int, int],
    lo: float,
    hi: float,
) -> None:
    """Shade around the designed color. Avoids clipped neon magenta."""
    if not np.any(mask):
        return
    src = rgb[mask].astype(np.float32)
    luma = src @ LUMA
    factor = lo + (luma / 255.0) * (hi - lo)
    recast = np.asarray(target, dtype=np.float32) * factor[:, None]
    rgb[mask] = np.clip(recast, 0, 255).astype(np.uint8)


def replace_toward(
    rgb: np.ndarray,
    mask: np.ndarray,
    target: tuple[int, int, int],
    strength: float,
) -> None:
    if not np.any(mask):
        return
    src = rgb[mask].astype(np.float32)
    target_arr = np.asarray(target, dtype=np.float32)
    rgb[mask] = np.clip(src + (target_arr - src) * strength, 0, 255).astype(
        np.uint8
    )


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


def region_stats(
    arr: np.ndarray, owner: np.ndarray, drawables: list
) -> dict[str, dict]:
    stats: dict[str, dict] = {}
    for region in REGION_FALLBACK:
        ids = [
            index
            for index, drawable in enumerate(drawables)
            if drawable.get("region") == region
        ]
        if not ids:
            continue
        mask = np.isin(owner, np.asarray(ids, dtype=np.int32))
        if not np.any(mask):
            continue
        patch = arr.copy()
        patch[~mask] = 0
        stats[region] = texture_stats(patch)
    return stats


def paint_melody(
    official_path: Path,
    still_path: Path,
    atlas_path: Path | None,
    mesh_map_path: Path,
    dest: Path,
) -> int:
    del atlas_path  # sparse atlas overlay shatters the live mesh
    del still_path  # still-band medians sampled the black backdrop
    mesh_map = json.loads(mesh_map_path.read_text())
    official = Image.open(official_path).convert("RGBA")
    arr = np.array(official)
    src_rgb = arr[..., :3].copy()
    drawables = list(mesh_map.get("drawables") or [])
    owner = assign_owners(arr, drawables)
    owned = owner >= 0
    gold_px = owned & gold_like(src_rgb)
    skin_px = owned & skin_like(src_rgb)

    region_index: dict[str, list[int]] = {}
    for index, drawable in enumerate(drawables):
        region_index.setdefault(drawable.get("region"), []).append(index)

    def owned_region(region: str) -> np.ndarray:
        ids = region_index.get(region) or []
        if not ids:
            return np.zeros(owner.shape, dtype=bool)
        return np.isin(owner, np.asarray(ids, dtype=np.int32))

    height, width = arr.shape[:2]
    yy, xx = np.indices((height, width))
    # Official packs the figure on the left/upper islands. Right/lower sheets
    # are water and hex FX — painting those AABBs is what made square shards.
    env_zone = (xx / max(width - 1, 1) > 0.55) | (yy / max(height - 1, 1) > 0.62)

    # Hanging ponytail islands sit in body/skirt bands. FX shards do not.
    hair_host = (
        owned_region("hair")
        | owned_region("body")
        | owned_region("skirt")
        | owned_region("arms")
        | owned_region("legs")
    ) & ~env_zone
    hair_px = hair_host & hair_like(src_rgb) & ~owned_region("face") & ~skin_px
    rgb = arr[..., :3]
    painted = 0

    face = owned_region("face") & ~env_zone
    # Face islands also cover the teal crop. Keep skin; silver the cloth.
    tint_toward(
        rgb,
        face & ~skin_px & ~hair_px,
        REGION_FALLBACK["body"],
        0.82,
        1.06,
    )
    painted += int(face.sum())

    figure = owned & ~env_zone

    # Skirt / dark cloth, but never on cyan hair or skin.
    skirt = (
        (owned_region("skirt") | owned_region("chestCloth"))
        & figure
        & ~hair_px
        & ~skin_px
    )
    replace_toward(rgb, skirt, REGION_FALLBACK["skirt"], 0.94)
    painted += int(skirt.sum())

    body = owned_region("body") & figure & ~hair_px & ~skin_px & ~skirt
    tint_toward(rgb, body, REGION_FALLBACK["body"], 0.82, 1.08)
    painted += int(body.sum())

    wings = owned_region("wings") & figure
    tint_toward(rgb, wings & ~gold_px, REGION_FALLBACK["wings"], 0.72, 1.08)
    tint_toward(rgb, wings & gold_px, REGION_FALLBACK["headset"], 0.6, 1.05)
    painted += int(wings.sum())
    sparkle = owned_region("sparkle") & figure
    tint_toward(rgb, sparkle, REGION_FALLBACK["sparkle"], 0.55, 1.02)
    painted += int(sparkle.sum())

    accessory = owned_region("accessory") & figure & ~hair_px & ~skin_px
    tint_toward(rgb, accessory & gold_px, REGION_FALLBACK["headset"], 0.6, 1.05)
    tint_toward(rgb, accessory & ~gold_px, REGION_FALLBACK["accessory"], 0.7, 1.05)
    painted += int(accessory.sum())

    headset = owned_region("headset") & figure
    tint_toward(rgb, headset, REGION_FALLBACK["headset"], 0.58, 1.06)
    painted += int(headset.sum())

    arms = owned_region("arms") & figure & ~hair_px & ~skin_px
    tint_toward(rgb, arms, REGION_FALLBACK["arms"], 0.9, 1.05)
    painted += int(arms.sum())

    legs = owned_region("legs") & figure & ~hair_px & ~skin_px
    tint_toward(rgb, legs, REGION_FALLBACK["legs"], 0.88, 1.06)
    painted += int(legs.sum())

    # Hair-owned figure pixels (env sheets excluded) plus cyan hanging strands.
    hair = hair_px | (owned_region("hair") & figure & ~skin_px)
    tint_toward(rgb, hair, REGION_FALLBACK["hair"], 0.72, 1.08)
    painted += int(hair.sum())

    leftover_teal = figure & hair_like(src_rgb) & ~hair & ~owned_region("sparkle")
    tint_toward(
        rgb,
        leftover_teal & (owned_region("face") | owned_region("body")),
        REGION_FALLBACK["body"],
        0.82,
        1.06,
    )
    tint_toward(
        rgb,
        leftover_teal & ~owned_region("face") & ~owned_region("body"),
        REGION_FALLBACK["hair"],
        0.72,
        1.08,
    )
    painted += int(leftover_teal.sum())

    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(dest, optimize=True)
    stats = texture_stats(arr)
    stats["painted"] = painted
    char = np.zeros(arr.shape[:2], dtype=bool)
    height, width = arr.shape[:2]
    for drawable in drawables:
        if drawable.get("region") in SKIP_REGIONS:
            continue
        box = uv_aabb(drawable.get("uv") or {}, width, height)
        if box is None:
            continue
        x0, y0, x1, y1 = box
        char[y0:y1, x0:x1] = True
    masked = arr.copy()
    masked[~char] = 0
    # Character stats must use owned figure pixels, not hex-sheet AABB leftovers.
    owned_char = arr.copy()
    owned_char[~(owned & ~env_zone)] = 0
    stats["character"] = texture_stats(owned_char)
    stats["characterAabb"] = texture_stats(masked)
    stats["regions"] = region_stats(arr, owner, drawables)
    hair_owned = arr.copy()
    hair_owned[~hair] = 0
    stats["hairPixels"] = texture_stats(hair_owned)
    (dest.parent / "texture-stats.json").write_text(f"{json.dumps(stats, indent=2)}\n")
    print(
        "hair",
        stats["hairPixels"]["mean"],
        "purple",
        stats["character"]["purple"],
        "teal",
        stats["character"]["teal"],
        flush=True,
    )
    return painted


def grove_recast_character(im: Image.Image, mesh_map: dict) -> None:
    arr = np.array(im)
    src = arr[..., :3].copy()
    drawables = list(mesh_map.get("drawables") or [])
    owner = assign_owners(arr, drawables)
    rgb = arr[..., :3]
    owned = owner >= 0
    chroma_toward(
        rgb,
        owned & ~skin_like(src),
        (72, 140, 88),
        50.0,
        140.0,
    )
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
