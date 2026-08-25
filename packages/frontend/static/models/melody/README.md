# Melody Cubism package

Complete Live2D model for the Melody identity.

- `miara_pro_t03.moc3` — official Miara topology (Cubism Editor owns mesh edits)
- `mesh-map.json` — ArtMesh UV-island index (region + motion/physics bindings)
- `textures/texture_00.png` — official 4096 atlas, region-tinted from Melody still
- `melody.physics3.json` — heavier ponytail, damped fairy cloth, musical wings

Regenerate the index with `pnpm --filter=@deltecho/avatar index:mesh-map`, then
`pnpm --filter=@deltecho/avatar bake:identity-models`.
