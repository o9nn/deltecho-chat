# Avatar Cubism models

Each identity has its own folder so mesh, texture, and physics can converge independently:

- `miara/` — official baked package + source `mesh-map.json`
- `deep-tree-echo/` — grove texture + living-wing physics
- `melody/` — region-tinted 4096 atlas + aria-style physics

`mesh-map.json` indexes each `ArtMeshN` UV island to a body region and the
physics/motion parameters that drive it. Rebuild with
`pnpm --filter=@deltecho/avatar index:mesh-map`.

Each identity owns its `*_t03.moc3`. Melody's map names
`models/melody/melody_t03.model3.json`, not Miara.
