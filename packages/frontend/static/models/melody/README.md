# Melody Cubism package

Complete Live2D model for the Melody identity.

- `melody_t03.model3.json` — Melody's Cubism entry (`sourceModel` in mesh-map)
- `melody_t03.moc3` — Melody mesh (replace this file to sculpt her figure)
- `mesh-map.json` — ArtMesh UV-island index (region + motion/physics bindings)
- `pose-map.json` — named A-pose / idle / talk / listen / emotion poses
- `avatar-mesh-map.json` — 2D Live2D ArtMesh regions ↔ 3D bind-pose groups
- `textures/texture_00.png` — official 4096 atlas, region-tinted from Melody still
- `melody_t03.physics3.json` — heavier ponytail, damped fairy cloth, musical wings

Regenerate the index with `pnpm --filter=@deltecho/avatar index:mesh-map`, then
`pnpm --filter=@deltecho/avatar bake:identity-models`.
