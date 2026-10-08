#!/usr/bin/env python3
"""Extract candidate DTE ArtMesh source layers and triangle UVs from DTE-owned art.

This is a genuine editable 2-D source mesh/PSD, NOT a compiled or rigged Cubism
model. The current flattened concept image cannot restore hidden/overlapping art;
PSD imports need manual separation, assembly, deformer weights and verification.
Never input Miara artwork or sample model assets here.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path

# Bounds are image-space pixels on the independently generated 1920px DTE
# reference sheet. These are candidate regions; missing/occluded pixels remain
# missing and must be drawn by the character artist before production use.
REGIONS = [
    ('wing_left_composite', (0, 1090, 790, 1740), None, 'wing', 'wings', 30),
    ('wing_right_composite', (1095, 1090, 1920, 1740), None, 'wing', 'wings', 30),
    ('skirt_front', (395, 619, 651, 813), (508, 696), 'skirt_harness', 'body', 18),
    ('torso_front', (396, 388, 605, 555), (460, 461), 'torso', 'body', 16),
    ('boot_candidate', (493, 837, 710, 1083), (600, 948), 'boots_legs', 'body', 18),
    ('face_profile_only', (766, 180, 900, 362), (831, 280), 'face', 'head', 14),
    ('hair_back', (14, 163, 313, 610), (137, 301), 'hair_back', 'head', 20),
    ('hair_bangs', (393, 9, 580, 202), (500, 105), 'hair_bangs', 'head', 16),
    ('eye_candidate', (893, 24, 1016, 143), (920, 65), 'eyes', 'head', 12),
]


def source_ok(image, path):
    if image.size != (1920, 1920) or image.mode != 'RGBA':
        raise ValueError('Expected DTE original 1920x1920 RGBA concept atlas')
    if 'miara' in path.name.lower():
        raise ValueError('Refuse a named Miara source; this generator is for original DTE art')
    if image.getchannel('A').getextrema()[0] > 0:
        raise ValueError('Expected a transparent source with candidate part islands')


def layer_from_region(image, bounds, seed):
    from PIL import ImageChops, ImageDraw, ImageFilter
    x0, y0, x1, y1 = bounds
    if x0 < 0 or y0 < 0 or x1 > image.width or y1 > image.height or x0 >= x1 or y0 >= y1:
        raise ValueError('Region exceeds image bounds')
    crop = image.crop(bounds)
    if seed is not None:
        sx, sy = seed[0] - x0, seed[1] - y0
        opaque = crop.getchannel('A').point(lambda a: 255 if a >= 64 else 0)
        if opaque.getpixel((sx, sy)) == 0:
            raise ValueError(f'Seed {seed} is transparent; retarget the source region')
        ImageDraw.floodfill(opaque, (sx, sy), 128, thresh=0)
        selected = opaque.point(lambda a: 255 if a == 128 else 0).filter(ImageFilter.MaxFilter(3))
        alpha = crop.getchannel('A')
        # Preserve original translucent edge values, but remove other isolated
        # art candidates inside this rectangle.
        crop.putalpha(ImageChops.multiply(alpha, selected))
    return crop


def triangulate(layer, step):
    """Produce positive-area lattice triangles clipped by pixel alpha.

    Each selected cell gets both triangles; transparent fragments around a cell
    are harmless because they sample RGBA alpha. It is a source mesh only.
    """
    width, height = layer.size
    alpha = layer.getchannel('A')
    xs = list(range(0, width, step)) + [width - 1]
    ys = list(range(0, height, step)) + [height - 1]
    xs, ys = sorted(set(xs)), sorted(set(ys))
    vertices, faces, seen = [], [], {}

    def vertex(x, y):
        key = (x, y)
        if key not in seen:
            seen[key] = len(vertices)
            vertices.append({'position_px': [x, y],
                             'uv': [round(x / width, 8), round(1 - y / height, 8)]})
        return seen[key]

    for row in range(len(ys) - 1):
        for col in range(len(xs) - 1):
            x0, x1 = xs[col], xs[col + 1]
            y0, y1 = ys[row], ys[row + 1]
            if x1 <= x0 or y1 <= y0 or alpha.getpixel(((x0 + x1) // 2, (y0 + y1) // 2)) < 48:
                continue
            a, b, c, d = vertex(x0, y0), vertex(x1, y0), vertex(x1, y1), vertex(x0, y1)
            faces.extend([[a, b, c], [a, c, d]])
    if not faces:
        raise ValueError('No opaque texture cells in region')
    return vertices, faces


def generate(source, out, psd=True):
    from PIL import Image, ImageDraw
    image = Image.open(source).convert('RGBA')
    source_ok(image, source)
    out.mkdir(parents=True, exist_ok=True)
    layers = out / 'layers'
    layers.mkdir(exist_ok=True)
    preview = Image.new('RGBA', image.size, (20, 18, 35, 255))
    strokes = []
    manifest = {
        'format': 'dte-original-artmesh-source-v1',
        'status': 'candidate ArtMesh source; NOT Cubism .moc3, .cmo3, deformed rig or production character',
        'source': source.name,
        'source_sha256': sha256(source.read_bytes()).hexdigest(),
        'canvas_px': list(image.size),
        'geometry_origin': 'user-referenced DTE concept atlas; ZERO Miara mesh or texture geometry',
        'uv_origin': 'bottom-left as in Cubism',
        'gaps': ['complete front face', 'hidden/back-facing hair and body', 'separated hands and fingers',
                 'two whole boots and complete leg silhouettes', 'individual feather/hinge wing layers',
                 'wing skinning and physics', 'original deformer hierarchy and approved character rights'],
        'areas': [],
    }
    document = None
    if psd:
        from psd_tools import PSDImage
        document = PSDImage.new(mode='RGB', size=image.size, depth=8)
    for name, bounds, seed, semantic, group, step in REGIONS:
        layer = layer_from_region(image, bounds, seed)
        if layer.getchannel('A').getbbox() is None:
            raise ValueError(f'Empty layer: {name}')
        verts, tris = triangulate(layer, step)
        path = layers / f'{name}.png'
        layer.save(path)
        preview.alpha_composite(layer, bounds[:2])
        strokes.append((name, group, bounds, verts, tris))
        manifest['areas'].append({
            'name': name, 'semantic': semantic, 'group': group,
            'status': 'candidate; artist must verify and repair layer separation/occlusion',
            'source_rect_px': list(bounds), 'layer_file': 'layers/' + path.name,
            'layer_sha256': sha256(path.read_bytes()).hexdigest(),
            'origin_px': list(bounds[:2]), 'size_px': list(layer.size),
            'vertices': verts, 'triangles': tris,
            'deformer_parent_suggestion': 'head' if group == 'head' else ('wing-' + name.split('_')[1] if group == 'wings' else 'body'),
            'rig_ready': False,
        })
        if document is not None:
            document.create_pixel_layer(layer, name=name, left=bounds[0], top=bounds[1])
    pen = ImageDraw.Draw(preview)
    for name, group, bounds, verts, tris in strokes:
        color = {'wings': (45, 231, 240, 180), 'body': (250, 114, 225, 180),
                 'head': (253, 195, 81, 180)}[group]
        for a, b, c in tris:
            xy = [(bounds[0] + verts[index]['position_px'][0],
                   bounds[1] + verts[index]['position_px'][1]) for index in (a, b, c)]
            pen.line([xy[0], xy[1], xy[2], xy[0]], fill=color, width=1)
        pen.text((bounds[0] + 2, bounds[1] + 2), name, fill=color)
    preview.convert('RGB').save(out / 'dte-artmesh-wireframe.png')
    (out / 'dte-artmesh-source.json').write_text(json.dumps(manifest, separators=(',', ':')) + '\n')
    if document is not None:
        document.save(out / 'dte-layer-candidates.psd')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--no-psd', action='store_true')
    args = parser.parse_args()
    result = generate(args.source, args.out, not args.no_psd)
    print(f"{len(result['areas'])} original DTE candidate ArtMeshes; {sum(len(a['vertices']) for a in result['areas'])} vertices; {sum(len(a['triangles']) for a in result['areas'])} triangles; {args.out.resolve()}")
