# PurismCore in DeltEcho

PurismCore is an **optional real MOC3 evaluator**, not a PSD-to-MOC3 authoring compiler. This integration retains the current Cubism core by default and changes no DTE core-self, ESN learning, DAO voting, scientific projection, speech generation, or outbound grants.

## Build and use

From a provisioned repository with Node 20–24 and pnpm 9.15.0:

```bash
pnpm check:purism
DELTECHO_CUBISM_CORE=purism pnpm build:electron
pnpm start:electron
```

The same selector works with `pnpm build:browser`. On PowerShell, set `$env:DELTECHO_CUBISM_CORE = 'purism'` before building. This is a **build-time selection**, not an environment flag read by the already-built application. Never assume setting a flag only at launch changes an existing artifact.

To restore the original backend, unset `DELTECHO_CUBISM_CORE` or set it to `cubism`, then rebuild. Unsupported values fail the build. There is no silent fallback from a failed Purism runtime to the original core.

`packages/frontend/bin/watch-frontend-static.mjs` serializes the existing copy commands and applies the selector last, so ordinary static-file changes cannot silently replace an opted-in core. Both target composition steps receive the selected file from the frontend output. `live2d-core-runtime.json` beside that output identifies the backend and exact packaged-script SHA-256.

## Exact runtime boundary

The repository vendors official PurismCore **v1.1.0**, source revision `1069334965522df5d0b791e97f01e26b19c45456`. Its release ZIP SHA-256 is `ee229d1b28c33a9f57f02c777f8633141042cd771e5e47bf4795ba345b3a0b39`, matching the recorded GitHub asset digest. Per-file hashes and byte lengths are in `third_party/purism-core/1.1.0/provenance.json`.

Only the tested v5 ABI enters application builds. The vendored v6 wrapper is retained exclusively for a negative ABI regression. Neither v6 nor the CC0 fixture is copied into application output.

The installed Cubism 4 wrapper expects `rawModel.drawables.renderOrders`; Purism exposes the genuine native array at `rawModel.renderOrders`. The adapter aliases **the same Int32Array**, checks the drawable count, refuses conflicting arrays, releases an incompatible model, and never creates substitute vertices or render orders. Installation occurs in the ordinary core-script bootstrap before SDK import, not via runtime code injection or network interception.

## Integrity, licensing and scope

`third_party/purism-core/1.1.0/LICENSE` is the upstream MIT license, and an opted-in build copies it as `purism-core.LICENSE` beside the core script. First-party adapter code is MIT-labelled. The full application retains its existing license; this integration does not remove Cubism SDK/model license requirements or grant rights in artwork.

The test-only fixture comes from pinned upstream `testdata/moc3/3d8e869a678a1dac.moc3`, declared CC0 by `LICENSE_TESTDATA`. That statement and source are preserved explicitly. The original source link recorded upstream is unavailable; this is upstream license provenance, not a newly obtained rights-holder attestation. The fixture is geometry QA, not a DTE character and not a distribution-approved DTE model.

Vendor digests detect accidental or unreviewed byte changes relative to the recorded repository manifest. They are not a signature system and do not protect against an authorized actor changing both code and manifest. Updating the runtime requires separately reviewing its source/license/ABI and rerunning real model tests.

## Tests and approvals

`pnpm check:purism` tests actual compiled WASM model loading/evaluation, native-buffer identity, geometry changes, invalid inputs and unsupported ABI, plus build-selection preservation. The dedicated Actions workflow runs on every pushed commit and PR update, independently of deployments. GitHub Actions can queue or fail when infrastructure is unavailable; tests do not certify all model versions or graphics drivers.

For a local desktop review, use an isolated persistent `DC_TEST_DIR` and private `DEEP_TREE_ECHO_IPC_PATH`, the existing offline Saved Messages account, and no outbound messages. Verify `rawModel instanceof PurismCore.Model`, finite drawable vertices, actual motion/expression behaviour, physics/resource loading, and the metadata backend. Linux software WebGL observations do not establish Windows hardware performance.

The currently inherited Miara-derived DTE/Melody rigs remain **legacy_unresolved** for source-rights review. Purism compatibility does not turn them into independently original rigs. A new DTE avatar still needs approved separated artwork, authored ArtMeshes/deformers/keyforms, a genuine Cubism export, exact-byte resource validation, and a separately recorded runtime/export approval. See [the PR91 approval drafts](provenance/README.md). Those drafts are not an enforced rights gate or approval.
