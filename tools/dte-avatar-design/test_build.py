#!/usr/bin/env python3
"""Regression checks for the independent DTE authoring blueprints."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from build import CHANNELS, COMPAT_LIMITS, motion, write


class DteAuthoringTests(unittest.TestCase):
    def test_areas_include_separate_wings_and_accessories(self):
        with TemporaryDirectory() as directory:
            out = write(Path(directory))
            profile = json.loads((out / 'dte-base-mesh-authoring.json').read_text())
            regions = {r['id']: r for r in profile['regions']}
            self.assertGreaterEqual(len(regions), 16)
            for area in ('wing_left', 'wing_right', 'choker', 'headphones', 'cheek_leds', 'skirt_harness'):
                self.assertIn(area, regions)
                self.assertFalse(regions[area]['export_ready'])
            self.assertIn('no .moc3/.cmo3', profile['status'])
            self.assertTrue(all('new_dte_art_requirement' in region for region in regions.values()))

    def test_motions_are_structurally_valid_and_do_not_own_lips_blinks_or_gaze(self):
        forbidden = {'ParamMouthOpenY', 'ParamMouthForm', 'ParamEyeLOpen', 'ParamEyeROpen',
                     'ParamEyeBallX', 'ParamEyeBallY'}
        for name, spec in CHANNELS.items():
            with self.subTest(name=name):
                obj = motion(name, spec)
                self.assertEqual(obj['Version'], 3)
                self.assertEqual(obj['Meta']['CurveCount'], len(obj['Curves']))
                self.assertEqual(obj['Meta']['TotalSegmentCount'], len(obj['Curves']) * 2)
                self.assertEqual(obj['Meta']['TotalPointCount'], len(obj['Curves']) * 3)
                self.assertFalse(forbidden.intersection(curve['Id'] for curve in obj['Curves']))
                for curve in obj['Curves']:
                    values = curve['Segments']
                    self.assertEqual(len(values), 8)
                    self.assertEqual((values[0], values[3], values[6]),
                                     (0, spec['duration'] / 2, spec['duration']))
                    lo, hi = COMPAT_LIMITS[curve['Id']]
                    self.assertTrue(all(lo <= v <= hi for v in (values[1], values[4], values[7])))

    def test_bad_range_fails_closed(self):
        with self.assertRaises(ValueError):
            motion('bad', {'duration': 1, 'loop': False, 'samples': {'ParamArmL1': [0, 999, 0]}})

    def test_repeatable_and_no_model_or_sample_distribution(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            a, b = write(root / 'a'), write(root / 'b')
            self.assertEqual({p.name: p.read_bytes() for p in a.iterdir()},
                             {p.name: p.read_bytes() for p in b.iterdir()})
            self.assertFalse(any(p.suffix in {'.moc3', '.cmo3', '.png'} for p in a.iterdir()))


if __name__ == '__main__':
    unittest.main()
