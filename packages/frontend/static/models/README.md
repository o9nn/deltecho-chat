# Avatar Cubism models

Each identity has its own folder so mesh, texture, and physics can converge independently:

- `miara/` — official baked package + source `mesh-map.json`
- `deep-tree-echo/` — grove texture + living-wing physics
- `melody/` — region-tinted 4096 atlas + aria-style physics

`mesh-map.json` indexes each `ArtMeshN` UV island to a body region and the
physics/motion parameters that drive it. Rebuild with
`pnpm --filter=@deltecho/avatar index:mesh-map`.

All three currently share Miara `.moc3` topology. Sculpt per-character meshes in Cubism Editor and replace the `.moc3` in that folder.
