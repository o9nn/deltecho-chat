# PurismCore vendor inventory

Upstream: https://github.com/SakuraMotion/PurismCore

Official web release: v1.1.0. Source revision: `1069334965522df5d0b791e97f01e26b19c45456`. Exact release and per-file SHA-256 values are recorded in `1.1.0/provenance.json`; upstream bytes are not formatted or patched.

- `1.1.0/core-v5.js`: optional application runtime, MIT; see `1.1.0/LICENSE`.
- `1.1.0/core-v6.js`: negative host-ABI fixture, not shipped by the application selector.
- `testdata/fixture.moc3`: test-only model, CC0 according to the pinned upstream `LICENSE_TESTDATA`. Original upstream filename: `testdata/moc3/3d8e869a678a1dac.moc3`. Upstream records its original `archlive2d` link as unavailable. Do not label this fixture as DTE artwork or an independently original rig.

Only `core-v5.js`, the first-party adapter and upstream MIT notice are selected into opted-in builds. No source PSD, artwork, character motion, texture, or new DTE MOC3 is included here. Runtime software licensing and model/artwork approval are separate.

See [integration and build instructions](../../docs/avatars/PURISM_RUNTIME.md).
