"""Offline structure-only tests for the AIRI Cubism package handoff."""

import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

from cubism_airi_interchange import ModelError, inspect, package

SCRIPT = Path(__file__).with_name("cubism_airi_interchange.py")


class InterchangeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="dte-airi-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "lucy"
        self.source.mkdir()
        (self.source / "textures").mkdir()
        (self.source / "expressions").mkdir()
        (self.source / "motion").mkdir()
        self.model = {
            "Version": 3,
            "FileReferences": {
                "Moc": "lucy.moc3",
                "Textures": ["textures/lucy.png"],
                "Physics": None,
                "Expressions": [{"Name": "Smile", "File": "expressions/smile.exp3.json"}],
                "Motions": {"Idle": [{"File": "motion/idle.motion3.json"}]},
            },
        }
        self.save_settings()
        (self.source / "lucy.moc3").write_bytes(b"MOC3synthetic-not-a-real-rig")
        (self.source / "textures/lucy.png").write_bytes(b"\x89PNG\r\n\x1a\nsynthetic-not-a-real-image")
        (self.source / "expressions/smile.exp3.json").write_text("{}")
        (self.source / "motion/idle.motion3.json").write_text("{}")

    def save_settings(self):
        (self.source / "lucy.model3.json").write_text(json.dumps(self.model))

    def test_package_has_one_nested_settings_file_and_its_references(self):
        output = self.root / "lucy-airi.zip"
        result = package(self.source, output, "lucy")
        self.assertEqual(result["status"], "structurally_valid_only")
        self.assertEqual(result["files"], 5)
        with zipfile.ZipFile(output) as archive:
            self.assertEqual(archive.testzip(), None)
            self.assertEqual(
                sorted(archive.namelist()),
                sorted(
                    [
                        "lucy/lucy.model3.json",
                        "lucy/lucy.moc3",
                        "lucy/textures/lucy.png",
                        "lucy/expressions/smile.exp3.json",
                        "lucy/motion/idle.motion3.json",
                    ]
                ),
            )
        with self.assertRaisesRegex(ModelError, "already exists"):
            package(self.source, output, "lucy")

    def test_wrong_character_or_extra_sample_is_rejected(self):
        with self.assertRaisesRegex(ModelError, "named 'hiyori'"):
            inspect(self.source, "hiyori")
        self.model["FileReferences"]["Moc"] = "hiyori.moc3"
        self.save_settings()
        with self.assertRaisesRegex(ModelError, "named character"):
            inspect(self.source, "lucy")
        self.model["FileReferences"]["Moc"] = "lucy.moc3"
        self.save_settings()
        (self.source / "hiyori.moc3").write_bytes(b"MOC3")
        with self.assertRaisesRegex(ModelError, "Exactly one"):
            inspect(self.source, "lucy")

    def test_missing_motion_or_expression_blocks_package(self):
        (self.source / "motion/idle.motion3.json").unlink()
        with self.assertRaisesRegex(ModelError, "Missing"):
            inspect(self.source, "lucy")
        self.model["FileReferences"]["Motions"] = {}
        self.save_settings()
        with self.assertRaisesRegex(ModelError, "motion is required"):
            inspect(self.source, "lucy")
        self.model["FileReferences"]["Motions"] = {"Idle": [{"File": "motion/idle.motion3.json"}]}
        self.model["FileReferences"]["Expressions"] = []
        self.save_settings()
        with self.assertRaisesRegex(ModelError, "expression is required"):
            inspect(self.source, "lucy")

    def test_traversal_and_symlink_assets_fail_closed(self):
        self.model["FileReferences"]["Textures"] = ["../outside.png"]
        self.save_settings()
        with self.assertRaisesRegex(ModelError, "Unsafe"):
            inspect(self.source, "lucy")
        self.model["FileReferences"]["Textures"] = ["textures/lucy.png"]
        self.save_settings()
        (self.source / "textures/lucy.png").unlink()
        (self.source / "textures/lucy.png").symlink_to(self.root / "outside.png")
        with self.assertRaisesRegex(ModelError, "Symlink"):
            inspect(self.source, "lucy")

    def test_fake_moc_and_uv_atlas_only_do_not_pass(self):
        (self.source / "lucy.moc3").write_bytes(b"NOT_A_MOC3")
        with self.assertRaisesRegex(ModelError, "MOC3 header"):
            inspect(self.source, "lucy")
        (self.source / "lucy.moc3").unlink()
        with self.assertRaisesRegex(ModelError, "Missing"):
            inspect(self.source, "lucy")

    def test_unsafe_urls_and_invalid_texture_fail(self):
        for unsafe in ("textures//lucy.png", "textures/%2e%2e/lucy.png"):
            self.model["FileReferences"]["Textures"] = [unsafe]
            self.save_settings()
            with self.assertRaisesRegex(ModelError, "Unsafe"):
                inspect(self.source, "lucy")
        self.model["FileReferences"]["Textures"] = ["textures/lucy.png"]
        self.save_settings()
        (self.source / "textures/lucy.png").write_bytes(b"not a PNG")
        with self.assertRaisesRegex(ModelError, "PNG signature"):
            inspect(self.source, "lucy")

    def test_output_cannot_be_placed_inside_source_folder(self):
        with self.assertRaisesRegex(ModelError, "outside"):
            package(self.source, self.source / "lucy-airi.zip", "lucy")

    def test_cli_exits_nonzero_for_unrigged_lucy(self):
        (self.source / "lucy.moc3").unlink()
        output = self.root / "never.zip"
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), "package", str(self.source), "--identity", "lucy", "--output", str(output)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 2)
        self.assertEqual(json.loads(proc.stderr)["status"], "blocked")
        self.assertFalse(output.exists())

    def test_lucy_blueprint_records_target_parts_not_shipped_assets(self):
        manifest = Path(__file__).resolve().parents[1] / "docs/avatars/lucy/rig-manifest.json"
        data = json.loads(manifest.read_text(encoding="utf-8"))
        parts = data["layers"]
        self.assertEqual(data["status"], "artwork_not_separated_no_moc3")
        self.assertEqual(data["sourceEvidence"]["uvAtlasLayers"], 1)
        self.assertGreater(len(parts), 40)
        self.assertEqual(len(parts), len({part["id"] for part in parts}))
        self.assertEqual([part["z"] for part in parts], sorted(part["z"] for part in parts))
        self.assertTrue({"eyes", "mouth", "wings", "face", "hair", "body", "clothes", "accessory"}.issubset({part["group"] for part in parts}))
        self.assertTrue(all(part.get("redraw") and part.get("deformer") for part in parts))


if __name__ == "__main__":
    unittest.main()
