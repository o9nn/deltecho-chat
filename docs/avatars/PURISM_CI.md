# Purism evaluator CI

`purism-live2d.yml` is a dedicated, dependency-free evaluator gate. It runs on **every push to every branch** and on **every pull request**; it has no path filters and no concurrency cancellation. The job has read-only repository permission, an eight-minute timeout, and pins every GitHub Action by full commit SHA.

## What it verifies

The job runs:

```bash
PURISM_CI_REPORT=artifacts/purism-live2d-report.json \
  node --test --test-reporter=spec \
  scripts/check-live2d-core-selection.test.mjs scripts/check-purism-models.test.mjs
```

The test reads `third_party/purism-core/1.1.0/provenance.json`, requires the exact fixed v1.1.0 file names and upstream source revision, and compares each vendored file's byte count and SHA-256 to both the provenance map and fixed review pins. Thus an altered core, altered fixture, altered provenance record, or a renamed/replaced sample fails the gate.

The same job also runs `scripts/check-live2d-core-selection.test.mjs`. That test proves that the default selection preserves the existing Cubism bytes, Purism selection packages the pinned v5 bytes plus the adapter in the normal core slot, an invalid selector fails closed, and the CC0 fixture and v6 core are never packaged.

Against the actual embedded Purism v5 WebAssembly evaluator and the vendored CC0 `fixture.moc3`, it verifies that:

- the unadapted model exposes its native `renderOrders` and not the legacy drawable alias;
- the adapter installs idempotently and aliases the **same native `Int32Array`** rather than a copy or generated substitute;
- all inspected native numeric parameter, part, and drawable arrays are finite;
- eye-blink and mouth-open parameters change real evaluated vertex buffers;
- invalid and materially truncated MOC3 inputs are rejected; and
- the actual vendored v6 evaluator is rejected by the v5-only adapter.

It also uses the product copy selector to build `live2dcubismcore.min.js` in a temporary directory, executes those exact packaged bytes, and initializes a genuine model through the bound `Live2DCubismCore` alias. This catches bootstrap/concatenation failures that separate vendor and adapter tests would miss.

The test writes a compact JSON report from actual runtime observations (ABI, counts, finite-array scan count, and changed-vertex counts). CI uploads it even when the test fails.

## Scope and limits

This is compiled-model and geometry QA only. The fixture is CC0 upstream test data, is explicitly **not a DeltEcho identity model**, and is never copied into application bundles. The workflow performs no fixture network download and does not build the app, install the workspace, or exercise a browser renderer.

It is therefore not a texture, shader, WebGL, Pixi/Cubism wrapper, or visual-fidelity test, and it makes no claim about an unseen character or rendered DeltEcho appearance. Browser/WebGL coverage, if added later, must load the real core, adapter, installed Cubism4 wrapper, and this clearly labelled fixture without fabricating texture output.

Runtime selection remains separate: `DELTECHO_CUBISM_CORE=cubism` is the default and `DELTECHO_CUBISM_CORE=purism` selects the optional evaluator through the build-copy script. This QA gate neither changes the default nor changes model identity, application assets, backend behavior, or cognitive components.

See [Purism runtime selection and boundaries](PURISM_RUNTIME.md) for the build-time integration contract.
