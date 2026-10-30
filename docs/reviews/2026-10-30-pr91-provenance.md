# PR #91: avatar authoring and provenance review

Reviewed PR head: `857bcf592c7aac86ff2d49b336e6d5084e3c3732`. Compared with merged main: `bf0aaafb3cc8a4ce292a31b94063f60f39a581bc`.

**Disposition: keep #91 open; request changes before calling it an enforced provenance gate or promoting its output to an original-character runtime.** This review adds documentation and a proposed contract, not a deployed policy verifier. It does not disable or modify existing avatar rendering.

## Useful work already present

The authoring tools provide source crop/triangulation blueprints, per-source/per-layer hashes, draft motion parameters and tests. They label their outputs `authoring_blueprint_only; no .moc3/.cmo3` and mark regions `export_ready: false`. The motion drafts are not referenced by a runtime model. No new compiled model or source texture is supplied by the reviewed PR. Those boundaries should remain.

The existing Miara filename rejection is a warning, not a rights gate: renaming the same input bypasses it. Hashes prove byte identity; they do not prove permission to extract, alter, rig or distribute the artwork.

## Current-main provenance observation

The bundled Miara, DTE and Melody MOC3 files at the reviewed main share SHA-256 `e7c9614904068550f6083bbb8d7d3d559a1b33b2c6ed6ba9e4acd92b85f5647a`. The source explicitly describes a shared Miara topology with different atlas/presentation mappings.

The [public Miara sample terms](https://www.live2d.com/eula/live2d-sample-model-terms_en.html) prohibit changes to the character design. The [sample page](https://www.live2d.com/en/learn/sample/miara/) requires agreement to the applicable license and terms. This review has not established whether a separate authorization or exception exists. **Byte equality and these public terms are not an infringement finding.** Record this as unresolved sample-derived provenance pending a matching reviewed grant; do not claim independent original rig authorship from a renamed filename or successful render.

## Required changes

1. **Approved input before extraction.** Hash the actual source, match an approved manifest, and require a reviewed rights-record reference covering derivative art, rigging, intended display/distribution and required attribution. Reject absent, expired, revoked or mismatched records before writing outputs. Private permission documents need not be committed publicly.
2. **Anti-relabel controls.** Use approved-source hashes and explicit origin classes, not a filename blacklist. Matching a restricted sample is evidence requiring review; a different hash alone does not establish original authorship.
3. **Source-output binding.** Include input attestation, policy version and actual source/layer/PSD/project hashes in the output manifest. Extraction remains authoring-only.
4. **Actual export closure.** At runtime approval, cover `model3.json`, MOC3, textures, physics, pose, display info, userdata, expressions and motions with per-file hashes and rights records. Bind any AIRI/DeltEcho package lease to that exact approved export. Preserve the existing interchange validator's traversal, symlink, signature, size and resource checks.
5. **Separate states.** Distinguish unverified, authoring-only approved input, export review pending, runtime approved, revoked, expired and unresolved legacy assets. Draft ArtMeshes and unbound motion JSON are not runtime approval.
6. **Offline by default.** Preserve the tools' current absence of remote/paid generation calls. Any future generator must be a separate explicitly authorized command whose output still enters the normal provenance review.
7. **Regression evidence.** Test renamed restricted inputs, absent/mismatched/revoked/expired attestations, replaced textures/MOC3, incomplete export resource coverage, unbound motion attachment and network generation remaining off by default.

The accompanying [proposed JSON Schema](pr91-provenance.schema.json) and [deliberately unapproved example](pr91-provenance-unapproved.example.json) are design artifacts only. They supply no permission, fabricated signature or runtime approval. A validator must reject the example until real input and reviewed records exist.

## Review boundaries

The review inspected PR-head source, bundled metadata and public terms. It did not execute #91's generators, invoke an editor or paid service, import artwork, or merge its branch. Its fixed source-atlas regions and unbound motion drafts still require authored, occlusion-safe layers and a genuine Cubism editor export. This is a technical review, not a determination about anyone's rights.

Source references: [PR #91](https://github.com/o9nn/deltecho-chat/pull/91), [authoring README at reviewed head](https://github.com/o9nn/deltecho-chat/blob/857bcf592c7aac86ff2d49b336e6d5084e3c3732/tools/dte-avatar-design/README.md), [shared identity rig](https://github.com/o9nn/deltecho-chat/blob/bf0aaafb3cc8a4ce292a31b94063f60f39a581bc/packages/avatar/src/automesh/identity-rig.ts), [structural interchange validator](https://github.com/o9nn/deltecho-chat/blob/bf0aaafb3cc8a4ce292a31b94063f60f39a581bc/scripts/cubism_airi_interchange.py).
