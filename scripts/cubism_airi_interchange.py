#!/usr/bin/env python3
"""Validate a character-owned Cubism 4 distribution and package it for AIRI.

This is a structural gate, NOT a MOC3 decoder, art separator, rig generator, or
proof of rendered behavior. It neither executes model contents nor installs a
model in DeltEcho/AIRI. Uses only Python's standard library.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath

MAX_FILES = 128
MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_TOTAL_BYTES = 256 * 1024 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class ModelError(ValueError):
    """A distribution violates the interchange contract."""


def read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError, OSError) as exc:
        raise ModelError(f"Invalid JSON: {path.name}: {exc}") from exc
    if not isinstance(data, dict):
        raise ModelError(f"Expected a JSON object: {path.name}")
    return data


def relative_asset(value: object, label: str) -> PurePosixPath:
    if not isinstance(value, str) or not value or re.search(r"[\\%\x00-\x1f]", value):
        raise ModelError(f"Unsafe {label} path: {value!r}")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in value.split("/")):
        raise ModelError(f"Unsafe {label} path: {value!r}")
    if ":" in value.split("/")[0]:
        raise ModelError(f"Unsafe {label} path: {value!r}")
    return path


def inspect(source: Path, identity: str) -> tuple[dict, dict[str, Path]]:
    """Return structural evidence and precisely referenced files, or fail closed."""
    source = source.resolve(strict=True)
    if not source.is_dir() or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{1,47}", identity):
        raise ModelError("Source must be a directory and identity a safe ASCII name")
    if source.name.casefold() != identity.casefold():
        raise ModelError(f"Model directory must be named {identity!r}")
    manifests = sorted(source.glob("*.model3.json"))
    if len(manifests) != 1:
        raise ModelError(f"Expected one Cubism 4 .model3.json, found {len(manifests)}")
    manifest = manifests[0]
    if not manifest.stem.casefold().startswith(identity.casefold()):
        raise ModelError("Model settings filename must identify the named character")
    settings = read_json(manifest)
    if settings.get("Version") != 3:
        raise ModelError("Expected a Cubism 4 Version 3 model3.json")
    refs = settings.get("FileReferences")
    if not isinstance(refs, dict):
        raise ModelError("Missing FileReferences object")
    moc = relative_asset(refs.get("Moc"), "Moc")
    if moc.suffix.casefold() != ".moc3" or not moc.stem.casefold().startswith(identity.casefold()):
        raise ModelError("MOC3 filename must identify the named character")
    textures = refs.get("Textures")
    if not isinstance(textures, list) or not textures:
        raise ModelError("At least one texture is required")
    if not isinstance(refs.get("Expressions"), list) or not refs["Expressions"]:
        raise ModelError("A named Cubism expression is required for a usable character")
    motions = refs.get("Motions")
    if not isinstance(motions, dict) or not any(
        isinstance(items, list) and items for items in motions.values()
    ):
        raise ModelError("At least one Cubism motion is required for a usable character")

    paths: dict[str, Path] = {}
    def add(value: object, label: str, suffix: str | None = None) -> None:
        relative = relative_asset(value, label)
        if suffix and not str(relative).casefold().endswith(suffix):
            raise ModelError(f"Unexpected {label} extension: {relative}")
        path = source.joinpath(*relative.parts)
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != source):
            raise ModelError(f"Symlink resource forbidden: {relative}")
        if not path.is_file() or not 0 < path.stat().st_size <= MAX_FILE_BYTES:
            raise ModelError(f"Missing, empty or oversized {label}: {relative}")
        if path.resolve(strict=True).is_relative_to(source) is False:
            raise ModelError(f"Resource escapes source directory: {relative}")
        paths[str(relative)] = path

    add(manifest.name, "settings", ".model3.json")
    add(str(moc), "Moc", ".moc3")
    for value in textures:
        add(value, "Texture", ".png")
    for field, suffix in (("Physics", ".physics3.json"), ("Pose", ".pose3.json"), ("DisplayInfo", ".cdi3.json"), ("UserData", ".userdata3.json")):
        if refs.get(field) is not None:
            add(refs[field], field, suffix)
    for item in refs["Expressions"]:
        if not isinstance(item, dict) or not isinstance(item.get("Name"), str) or not item["Name"]:
            raise ModelError("Expression entries require Name and File")
        add(item.get("File"), "Expression", ".exp3.json")
    for group, entries in motions.items():
        if not isinstance(entries, list):
            raise ModelError(f"Invalid motion group {group!r}")
        for entry in entries:
            add(entry.get("File") if isinstance(entry, dict) else None, "Motion", ".motion3.json")

    if len(paths) > MAX_FILES or sum(p.stat().st_size for p in paths.values()) > MAX_TOTAL_BYTES:
        raise ModelError("Model exceeds bounded interchange file/byte budget")
    if len({p.casefold() for p in paths}) != len(paths):
        raise ModelError("Case-colliding resource paths are not portable")
    with paths[str(moc)].open("rb") as stream:
        if stream.read(4) != b"MOC3":
            raise ModelError("Referenced MOC3 has no MOC3 header")
    for value in textures:
        with paths[str(relative_asset(value, "Texture"))].open("rb") as stream:
            if stream.read(8) != PNG_SIGNATURE:
                raise ModelError(f"Texture lacks PNG signature: {value}")
    for key, path in paths.items():
        if key.casefold().endswith(".json"):
            read_json(path)
    # No hidden Hiyori/Miara sample MOC may be included or mistaken for Lucy.
    all_mocs = sorted(p for p in source.rglob("*.moc3") if p.is_file())
    if len(all_mocs) != 1 or all_mocs[0].resolve() != paths[str(moc)].resolve():
        raise ModelError("Exactly one character-owned MOC3 is permitted")
    return {
        "identity": identity,
        "model": manifest.name,
        "moc": str(moc),
        "files": len(paths),
        "bytes": sum(p.stat().st_size for p in paths.values()),
        "expressions": len(refs["Expressions"]),
        "motions": sum(len(group) for group in motions.values()),
        "status": "structurally_valid_only",
    }, paths


def package(source: Path, output: Path, identity: str) -> dict:
    summary, paths = inspect(source, identity)
    output = output.resolve()
    if output.exists():
        raise ModelError(f"Output already exists: {output}")
    if output.is_relative_to(source.resolve()):
        raise ModelError("Output ZIP must be outside the model source directory")
    output.parent.mkdir(parents=True, exist_ok=True)
    created = False
    try:
        archive = zipfile.ZipFile(output, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6)
        created = True
        with archive:
            for name, path in sorted(paths.items()):
                entry = zipfile.ZipInfo(f"{identity}/{name}", date_time=(1980, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
        with zipfile.ZipFile(output) as archive:
            if archive.testzip() or len(archive.namelist()) != len(paths):
                raise ModelError("ZIP integrity check failed")
    except BaseException:
        if created:
            output.unlink(missing_ok=True)
        raise
    summary["zip"] = str(output)
    summary["sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("validate", "package"))
    parser.add_argument("source", type=Path, help="Exported Cubism 4 model folder")
    parser.add_argument("--identity", required=True, help="Expected character name, e.g. lucy")
    parser.add_argument("--output", type=Path, help="New AIRI import ZIP path (package only)")
    args = parser.parse_args()
    try:
        if args.operation == "package" and not args.output:
            raise ModelError("--output is required for package")
        result = package(args.source, args.output, args.identity) if args.operation == "package" else inspect(args.source, args.identity)[0]
    except (ModelError, OSError) as exc:
        print(json.dumps({"status": "blocked", "reason": str(exc)}), file=sys.stderr)
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
