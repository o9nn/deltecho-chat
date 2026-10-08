#!/usr/bin/env python3
"""Bounded tests for the DTE-owned image-to-ArtMesh-source pipeline."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from PIL import Image
from psd_tools import PSDImage

from generate_mesh import layer_from_region, source_ok, triangulate


class MeshGenerationTests(unittest.TestCase):
    def test_seed_selects_one_opaque_part_not_neighbour(self):
        image = Image.new('RGBA', (64, 32), (0, 0, 0, 0))
        for x in range(4, 24):
            for y in range(4, 24):
                image.putpixel((x, y), (200, 100, 80, 255))
        for x in range(35, 54):
            for y in range(4, 24):
                image.putpixel((x, y), (90, 80, 70, 255))
        part = layer_from_region(image, (0, 0, 64, 32), (10, 10))
        self.assertGreater(part.getpixel((10, 10))[3], 0)
        self.assertEqual(part.getpixel((45, 10))[3], 0)
        verts, tris = triangulate(part, 8)
        self.assertGreater(len(verts), 4)
        self.assertGreater(len(tris), 1)
        for vertex in verts:
            self.assertTrue(all(0 <= value <= 1 for value in vertex['uv']))
        for triangle in tris:
            self.assertEqual(len(set(triangle)), 3)
            self.assertTrue(all(0 <= index < len(verts) for index in triangle))
            a, b, c = (verts[index]['position_px'] for index in triangle)
            self.assertNotEqual((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]), 0)

    def test_named_sample_or_wrong_art_does_not_pass(self):
        image = Image.new('RGBA', (1920, 1920), (20, 30, 40, 0))
        source_ok(image, Path('dte-original.png'))
        with self.assertRaises(ValueError):
            source_ok(image, Path('miara-original.png'))
        with self.assertRaises(ValueError):
            source_ok(Image.new('RGB', (1920, 1920)), Path('dte-original.png'))
        with self.assertRaises(ValueError):
            source_ok(Image.new('RGBA', (4, 4)), Path('dte-original.png'))

    def test_layered_psd_roundtrip_is_editable_source_not_compiled_model(self):
        image = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
        image.putpixel((4, 4), (28, 190, 245, 255))
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'dte.psd'
            psd = PSDImage.new(mode='RGB', size=(32, 32), depth=8)
            psd.create_pixel_layer(image, name='DTE-original-wing', left=5, top=7)
            psd.save(path)
            reopened = PSDImage.open(path)
            self.assertEqual(reopened.size, (32, 32))
            self.assertEqual(len(reopened), 1)
            self.assertEqual(reopened[0].name, 'DTE-original-wing')
            self.assertEqual(reopened.composite().convert('RGBA').getpixel((9, 11))[:3],
                             (28, 190, 245))
            self.assertFalse(any(Path(directory).glob('*.moc3')))


if __name__ == '__main__':
    unittest.main()
