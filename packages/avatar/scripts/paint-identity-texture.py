#!/usr/bin/env python3
"""Tint official Miara UV islands toward an identity still using mesh-map.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image


REGION_FALLBACK = {
    "hair": (118, 62, 186),
    "headset": (228, 186, 58),
    "face": (236, 188, 168),
    "body": (90, 196, 206),
    "chestCloth": (20, 20, 24),
    "skirt": (18, 16, 22),
    "arms": (236, 188, 168),
    "legs": (28, 26, 32),
    "wings": (236, 176, 214),
    "sparkle": (255, 240, 200),
    "accessory": (200, 180, 90),
}

REGION_STRENGTH = {
    "hair": 0.72,
    "headset": 0.82,
    "face": 0.48,
    "body": 0.7,
    "chestCloth": 0.35,
    "skirt": 0.78,
    "arms": 0.55,
    "legs": 0.7,
    "wings": 0.62,
    "sparkle": 0.4,
    "accessory": 0.65,
}

SKIP_REGIONS = {"environment"}


def luminance(rgb: tuple[int, int, int]) -> float:
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


def sample_still(
    still: Image.Image,
    figure: dict,
    point: dict,
) -> tuple[int, int, int] | None:
    width, height = still.size
    fig_w = max(figure.get("w") or figure.get("width") or 1, 1e-6)
    fig_h = max(figure.get("h") or figure.get("height") or 1, 1e-6)
    u = (point["x"] - figure["x"]) / fig_w
    v = 1.0 - (point["y"] - figure["y"]) / fig_h
    if u < 0 or u > 1 or v < 0 or v > 1:
        return None
    px = min(width - 1, max(0, int(u * (width - 1))))
    py = min(height - 1, max(0, int(v * (height - 1))))
    pixel = still.getpixel((px, py))
    if len(pixel) > 3 and pixel[3] < 16:
        return None
    return (pixel[0], pixel[1], pixel[2])


def tint_island(
    pixels,
    size: tuple[int, int],
    uv: dict,
    target: tuple[int, int, int],
    strength: float,
) -> int:
    width, height = size
    x0 = max(0, int(uv["x"] * width))
    y0 = max(0, int(uv["y"] * height))
    x1 = min(width, int((uv["x"] + uv["w"]) * width) + 1)
    y1 = min(height, int((uv["y"] + uv["h"]) * height) + 1)
    target_lum = max(luminance(target), 1.0)
    painted = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = pixels[x, y]
            if a < 16:
                continue
            lum = luminance((r, g, b))
            scale = lum / target_lum
            nr = min(255, max(0, target[0] * scale))
            ng = min(255, max(0, target[1] * scale))
            nb = min(255, max(0, target[2] * scale))
            pixels[x, y] = (
                int(r + (nr - r) * strength),
                int(g + (ng - g) * strength),
                int(b + (nb - b) * strength),
                a,
            )
            painted += 1
    return painted


def grove_recast_character(im: Image.Image, mesh_map: dict) -> None:
    pixels = im.load()
    width, height = im.size
    for drawable in mesh_map.get("drawables", []):
        if drawable.get("region") == "environment":
            continue
        uv = drawable.get("uv") or {}
        x0 = max(0, int(uv.get("x", 0) * width))
        y0 = max(0, int(uv.get("y", 0) * height))
        x1 = min(width, int((uv.get("x", 0) + uv.get("w", 0)) * width) + 1)
        y1 = min(height, int((uv.get("y", 0) + uv.get("h", 0)) * height) + 1)
        for y in range(y0, y1):
            for x in range(x0, x1):
                pr, pg, pb, pa = pixels[x, y]
                if pa < 8:
                    continue
                nr = int(pr * 0.42 + pg * 0.38 + pb * 0.20)
                ng = int(pr * 0.18 + pg * 0.62 + pb * 0.20)
                nb = int(pr * 0.12 + pg * 0.28 + pb * 0.40)
                pixels[x, y] = (min(255, nr), min(255, ng), min(255, nb), pa)


def paint_melody(official_path: Path, still_path: Path, atlas_path: Path | None, mesh_map_path: Path, dest: Path) -> int:
    mesh_map = json.loads(mesh_map_path.read_text())
    official = Image.open(official_path).convert("RGBA")
    still = Image.open(still_path).convert("RGBA")
    pixels = official.load()
    painted = 0
    figure = mesh_map.get("figure") or {}
    for drawable in mesh_map.get("drawables", []):
        region = drawable.get("region")
        if region in SKIP_REGIONS:
            continue
        uv = drawable.get("uv") or {}
        if uv.get("w", 0) <= 0 or uv.get("h", 0) <= 0:
            continue
        target = sample_still(still, figure, drawable.get("figure") or {}) or REGION_FALLBACK.get(
            region, (128, 128, 128)
        )
        painted += tint_island(
            pixels,
            official.size,
            uv,
            target,
            REGION_STRENGTH.get(region, 0.55),
        )
    if atlas_path and atlas_path.exists():
        atlas = Image.open(atlas_path).convert("RGBA").resize(official.size, Image.Resampling.LANCZOS)
        official.paste(atlas, (0, 0), atlas)
    dest.parent.mkdir(parents=True, exist_ok=True)
    official.save(dest, optimize=True)
    return painted


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
        painted = paint_melody(official, still, atlas if str(atlas) != "-" else None, mesh_map, dest)
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
