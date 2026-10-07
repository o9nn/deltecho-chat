#!/usr/bin/env python3
"""Generate DTE-owned Cubism authoring blueprints, never a modified Miara model.

Requires an independently authored, licensed part-separated DTE character for .cmo3/.moc3
export. The JSON below describes intended independent ArtMeshes, not Miara UV data.
"""
import argparse
import json
from pathlib import Path

REGIONS = [
    ('hair_bangs', 'head', 'Hair Front', 'separate swept silver-cyan bangs and forehead occlusion'),
    ('hair_side_left', 'head', 'Hair Side L', 'left silver-cyan wave; independent physics'),
    ('hair_side_right', 'head', 'Hair Side R', 'right silver-cyan wave; independent physics'),
    ('hair_back', 'head', 'Hair Back', 'back silver-cyan locks and over-shoulder separation'),
    ('face', 'head', 'Face', 'original face, cyan cheek-node mounting, no borrowed portrait'),
    ('eyes', 'head', 'Eye', 'original blue-gray irises and FACS-ready lids'),
    ('headphones', 'head', 'Hair Accessory Front', 'new metal headset with amber emissive cups'),
    ('choker', 'neck', None, 'new neck ArtMesh and original deformation weights'),
    ('torso', 'body', 'Bust / Trunk', 'iridescent cropped top above original skin art'),
    ('arms_hands', 'body', 'Arm L / Arm R / Hand L', 'independent skin, fingerless gloves, fists'),
    ('skirt_harness', 'body', 'Lower Body', 'pleated black skirt, purple buckles and hanging straps'),
    ('boots_legs', 'body', 'Leg L / Leg R', 'independent legs, strapped gray boots and soles'),
    ('wing_left', 'body', 'Wing Back L(Skinning) / Wing L 2(Skinning)', 'new articulated left crystal wing; feather layers and separate hinge'),
    ('wing_right', 'body', 'Wing Back R(Skinning) / Wing R 2(Skinning)', 'new articulated right crystal wing; feather layers and separate hinge'),
    ('wing_ribbons', 'body', None, 'new separately rigged cyan-magenta trailing ribbons'),
    ('cheek_leds', 'head', None, 'new cyan bioluminescent cheek nodes; no baked moving features'),
]

# DTE-owned draft motion channels. Units are Cubism param values, not 3-D joints.
# Mouth, eyes, and gaze are intentionally unowned: AIRI speech/blink and bounded cue
# stream retain priority. Combat references are design inspirations, not Miara motion.
CHANNELS = {
    'idle': {
        'duration': 4.0,
        'loop': True,
        'samples': {
            'ParamAngleY': [0, 0.7, 0], 'ParamAngleZ': [0, -0.8, 0],
            'ParamBodyAngleX': [0, 0.7, 0], 'ParamBodyAngleZ': [0, 0.5, 0],
            'ParamBreath': [0.35, 0.65, 0.35],
            'ParamFlapping3': [0, 2, 0], 'ParamFlapping4': [0, -2, 0],
        },
    },
    'explore': {
        'duration': 3.2,
        'loop': False,
        'samples': {
            'ParamAngleX': [0, -5, 0], 'ParamAngleY': [0, 2, 0],
            'ParamBodyAngleX': [0, -1.4, 0],
            'ParamArmR1': [0, 3, 0], 'ParamArmL1': [0, -2, 0],
            'ParamFlapping3': [0, 2.5, 0], 'ParamFlapping4': [0, -2.5, 0],
        },
    },
    'wing_guard': {
        'duration': 2.8,
        'loop': False,
        'samples': {
            'ParamAngleY': [0, -2, 0], 'ParamBodyAngleZ': [0, -2, 0],
            'ParamArmR1': [0, 7, 0], 'ParamArmL1': [0, -7, 0],
            'ParamFlapping3': [0, 5, 0], 'ParamFlapping4': [0, -5, 0],
            'ParamFlapping7': [0, 4, 0], 'ParamFlapping8': [0, -4, 0],
        },
    },
}
# Compatibility-only limits measured by Cubism Core from the Miara sample. This
# proves numeric plausibility, not that those motions are applied to Miara.
COMPAT_LIMITS = {
    'ParamAngleX': (-30, 30), 'ParamAngleY': (-30, 30), 'ParamAngleZ': (-30, 30),
    'ParamBodyAngleX': (-10, 10), 'ParamBodyAngleZ': (-10, 10), 'ParamBreath': (0, 1),
    'ParamArmL1': (-30, 30), 'ParamArmR1': (-30, 30),
    **{f'ParamFlapping{n}': (-30, 30) for n in (3, 4, 7, 8)},
}


def motion(name, spec):
    duration = spec['duration']
    curves = []
    for parameter, (a, b, c) in spec['samples'].items():
        lo, hi = COMPAT_LIMITS[parameter]
        if not all(lo <= v <= hi for v in (a, b, c)):
            raise ValueError(f'{name}: {parameter} out of bounds')
        # Two linear segments: [time0, value0, type0, time1, value1, type0, time2, value2]
        curves.append({'Target': 'Parameter', 'Id': parameter,
                       'Segments': [0, a, 0, duration / 2, b, 0, duration, c]})
    return {
        'Version': 3,
        'Meta': {'Duration': duration, 'Fps': 30, 'Loop': spec['loop'],
                 'AreBeziersRestricted': True, 'CurveCount': len(curves),
                 'TotalSegmentCount': 2 * len(curves), 'TotalPointCount': 3 * len(curves),
                 'UserDataCount': 0, 'TotalUserDataSize': 0},
        'Curves': curves, 'UserData': [],
    }


def write(out):
    out.mkdir(parents=True, exist_ok=True)
    base = {
        'id': 'dte-original-authoring-profile-v1',
        'status': 'authoring_blueprint_only; no .moc3/.cmo3, no licensed Miara reskin',
        'rig_source_required': 'Artist-approved, part-separated DTE PSD/PSB and native Cubism .cmo3',
        'uv_rule': 'Create independent DTE ArtMeshes/UVs in Cubism Editor; do not copy Miara UV triangles or binary',
        'authority': 'Presentation only; no core-self identity mutation or art-design authority from a cue stream',
        'regions': [
            {'id': area, 'parent': parent, 'miara_semantic_analogy_only': analogy,
             'new_dte_art_requirement': requirement, 'export_ready': False}
            for area, parent, analogy, requirement in REGIONS
        ],
        'non_mesh_assets': ['night_city_background', 'neon_particles', 'magic_orb'],
        'cubism_export_gate': ['all art independently authored/licensed', 'parts fully separated',
                               'new DTE art meshes and weights validated', 'extreme pose visual tests',
                               'lip/blink coexistence', 'runtime/model hash binding'],
    }
    (out / 'dte-base-mesh-authoring.json').write_text(json.dumps(base, indent=2) + '\n')
    for name, spec in CHANNELS.items():
        (out / f'dte-{name}.motion3.json').write_text(json.dumps(motion(name, spec), indent=2) + '\n')
    (out / 'dte-motions-manifest.json').write_text(json.dumps({
        'status': 'unbound_blueprint; attach only after DTE-owned rig export and parameter readback',
        'sample_based_on': 'DTE user-provided walk/explore/wing-guard visual concepts',
        'groups': {name: f'dte-{name}.motion3.json' for name in CHANNELS},
        'reserved_channels': ['mouth/lip_sync', 'eye/blink', 'gaze/manual', 'DTE read-only stage cue'],
        'on_missing_parameter': 'drop motion channel; never invent parameter on Miara binary',
        'on_canonical_identity_failure': 'stop DTE stage cues; preserve art/motions separately',
    }, indent=2) + '\n')
    return out


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    print(write(parser.parse_args().out).resolve())
