# DTE original-avatar authoring template

This folder turns Deep Tree Echo's supplied cyberpunk astral references into an **original-character ArtMesh source, candidate layered PSD and motion blueprint**. It is not a compiled/rigged Cubism model or a transformation of Live2D's Miara sample. The source mesh uses DTE reference pixels and independently generated triangle UVs, **not** the Miara model's geometry or texture. Run `python3 tools/dte-avatar-design/build.py --out /tmp/dte-avatar-blueprints` and `python3 -m unittest discover -s tools/dte-avatar-design -p 'test_*.py'` from the repository root.

## Why the Miara pilot cannot simply be reskinned

The [official Miara sample page](https://www.live2d.com/en/learn/sample/miara/) identifies it as a teaching/SDK sample with fairy and moving background integrated into the character. The [sample terms, version 1.7](https://www.live2d.com/eula/live2d-sample-model-terms_en.html), specifically state **“No changes of any kind to the design of this character are permitted”** for Miara. The earlier `mesh-painter` skill's example of painting a new DTE character onto Miara therefore must not be executed under those terms. The existing unmodified Miara stage pilot may be evaluated subject to its terms and required attribution; a changed `.moc3`, texture, or character-relabeling package is not provided. Contact Live2D Support for an exception before any such use, or use an independently authored/appropriately licensed DTE rig. No Miara binary, source atlas, UV geometry, or pixels are committed here.

## Correspondence without asset transposition

Read-only Cubism Core inspection of the existing sample established 187 drawables and 138 parameters. `Hair Front`, `Hair Side L/R`, `Hair Back`, `Hair Twin L/R`, `Face`, `Eye`, `Bust`, `Trunk`, `Lower Body`, `Arm L/R`, `Leg L/R`, `Wing Back L/R(Skinning)` and `Wing L/R 2(Skinning)` supply **semantic categories** for planning independent DTE ArtMeshes. They do **not** supply a license to copy the sample's UV coordinates, mesh triangles, character proportions, or pixels. New DTE-specific pieces—including headphones, glowing cheek nodes, choker, pleated black skirt, harness, crystal-feather wings and trailing ribbons—require separate illustrated layers, ArtMeshes, deformers and valid weights. A flattened concept atlas or procedural wing-material swatch does not supply them.

`dte-base-mesh-authoring.json` lists the original DTE regions and their parent concepts. `dte-*.motion3.json` are **unbound, conservative draft parameter curves** in a standard motion JSON shape, referencing common/observed Cubism parameter names only. They do not update Miara's motions, and no `model3.json` refers to them. Validate parameter existence and ranges on an **authorized DTE-owned rig**, then tune extremes by rendered-frame checks. The authoring template reserves mouth/lip-sync, blink/eyes, gaze and the canonical presentation cue's seven read-only axes rather than overriding them.

## Generate source meshes from original DTE art

The separately supplied DTE concept atlas is an RGBA 1920×1920 **flattened reference**, not Miara's texture. From a licensed/authorized original DTE atlas of that layout, run:

```bash
python3 -m pip install -r tools/dte-avatar-design/requirements-mesh.txt
python3 tools/dte-avatar-design/generate_mesh.py \
  --source /path/to/dte-astral-atlas-concept.png \
  --out /tmp/dte-original-mesh
```

The result contains nine original **candidate** hair/face/eye/top/skirt/boot/wing RGBA layers, an editable layered `dte-layer-candidates.psd`, actual 2D vertices/UV triangles in `dte-artmesh-source.json`, and `dte-artmesh-wireframe.png` for visual QA. The generator keeps translucent painted edges, selects seed-connected pieces, refuses Miara-named inputs, and never mutates its input. Each face is positive-area and its UV stays within the source layer; CI tests PSD round-trip and mask isolation. A filename guard is **not** a rights check: the operator must independently establish rights to every source image.

This is a real source mesh, but the supplied flat atlas lacks front-face art, complete legs, hidden/back-facing layers, individually separated feathers and rigged hinges. Several layers are **cropped composites**, not final occlusion-safe parts. Their original sheet coordinates are not a posed character. The PSD should be opened as an **authoring starting point** in Cubism Editor; the artist must refine separation, move parts into a coherent full-body assembly, fill missing art, create deformers/keyforms/weights/physics, and export the new DTE model there. Do not call the JSON, PSD or material swatches `.moc3`, and do not attach unbound draft motions to another character's model.

## Export path

The [official PSD import guide](https://docs.live2d.com/en/cubism-editor-manual/psd-import/) explains that Cubism Editor converts each PSD layer into an ArtMesh; its [mesh generator guide](https://docs.live2d.com/en/cubism-editor-manual/mesh-edit/) recommends artist refinement rather than rerunning automatic mesh generation after keyforms are made. Complete the candidate PSD with independently approved DTE front/back hair, face/eyes/mouth, arms/hands, torso/top, skirt/harness, legs/boots, both wings with feather bands/hinges, headphones, cheek nodes, choker and ribbons. Rig/unwrap the original DTE ArtMeshes and verify overlap/overhang with [Cubism's atlas editor](https://docs.live2d.com/en/cubism-editor-manual/texture-atlas-edit/). Export a real DTE-owned `.cmo3`/`.moc3`, `.model3.json`, textures, motions, expressions and physics; only then validate interchange and load in AIRI and DeltEcho. A generated source mesh is not yet an artist-approved part-separated or compiled character model.

The DTE→AIRI broker remains a revocable, local presentation path. Matching a new model's SHA-256 and rendered frames is a separate test. Do not bypass core-self proof checks, publish the private pilot archive, or assume an unbound motion implies a real runtime gesture. Preserve original sample attribution if independently showcasing unchanged Miara under its terms.
