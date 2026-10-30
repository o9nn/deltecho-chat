# AIRI stage cues — outbound, revocable presentation bridge

**Status:** source-level adapter, stage-side compositor, and tests. This is **not** an installed AIRI plugin or authenticated interprocess connection. A generic character is an acceptable **first integration target**; it must remain labeled as that character rather than a newly authored DTE rig. The existing Lucy UV atlas and Hiyori/Miara samples are **not** a new character-owned export; see [Lucy's authoring contract](lucy/CONVERSION_AND_AIRI.md).

## Boundary

```text
private DTE daemon + accepted core-self (authoritative inside DTE only)
  → local authenticated/leased cognitive broker (host responsibility)
  → projectDTEchoCognitiveState (presentation prediction)
  → AiriStageCueAdapter (bounded, ephemeral, outbound only)
  → authenticated local transport (not yet implemented)
  → AiriStageCueHost (model-bound, stage-owned compositor)
  → imported, identity-verified Live2D stage
```

The adapter lives at `packages/avatar/src/adapters/airi-stage-cue-adapter.ts`. It has **no** AIRI dependency, socket, credential, Delta Chat profile access, model loader, or core-self write path. The stage host supplies the selected **actual** model ID, its lowercase SHA-256 digest, and expression/motion names read from that model's manifest. A string match is not a cryptographic attestation: the host must validate the model bytes and authenticate the private local DTE session before constructing a lease. A source label alone never proves authority.

Its sink has only `publish(cue)` and `release(leaseId)`. Only normalized eye/head/body pose axes, and model-declared named expressions/motions, can leave DTE. Unknown Cubism parameters and the whole cognitive input are dropped. **Mouth, audio levels, translations, messages, secrets, and canonical identity events are not transportable cues.** When speech is active, named expression and motion are withheld too; the local audio/lip-sync owner retains mouth priority. Absent core-self initialization, wrong model digest/ID, stale or future observations, non-finite values, malformed lease, or an expired lease cause a fail-closed rejection. Duplicate/out-of-order samples cannot replay. A new lease releases the old one before publishing, and disposal/revocation/timeout releases only DTE-owned stage controls. An explicit rejection from the host is returned as `rejected` by the sender. The stage sink must independently enforce `expiresAt` and revoke controls on transport loss; it must never treat a cue as an instruction to reset the entire AIRI stage.

AIRI's [MAGIC driver Pose axes](https://github.com/moeru-ai/airi/blob/91953f0/packages/model-driver-magic-live2d/src/pose.ts) inform the subset used here, but [`@proj-airi/model-driver-magic-live2d`](https://github.com/moeru-ai/airi/blob/91953f0/packages/model-driver-magic-live2d/package.json) is private. Its `Target.apply(Pose)` requires a **complete** pose, including mouth; passing this sparse cue directly to that target would steal audio ownership. `AiriStageCueHost` validates the selected model, expiry, numeric bounds, field allowlist and names, then overlays only DTE-owned axes onto AIRI's **current** complete pose. AIRI still owns mouth, offsets, speech and the selected model. The host has its own expiry timer and rejects replay. A byte-identical retransmission does not cancel an active valid lease. It has no socket or credential store; an independently authenticated local transport must bind an actual session and verified package digest before publishing.

The host is tested against AIRI's complete 13-axis Pose shape, but **is not wired into** AIRI's Vue `Model.vue` or motion driver. AIRI has a [plugin protocol](https://github.com/moeru-ai/airi/tree/91953f0/packages/plugin-protocol), but no stage-cue event contract was identified in the inspected event types on 6 October 2026. Its MIT-licensed stage cannot simply copy GPL-licensed DeltEcho code. Use a reviewed interface or separately licensed implementation and run a real host integration test before claiming protocol compatibility.

The attached GTAngelEcho KSM reference defines 5D personality, 8D communication and 8D intelligence vectors, and L0–L7 backup layers. Those are a **design for GTAngelEcho**, not verified current DTE identity state or permission to write its core-self ledger. Only the accepted local identity can authorize an outbound presentation lease; AIRI never becomes the identity owner.

## Generic-model first pass

The existing `packages/frontend/static/models/miara/miara_pro_t03.model3.json` passed the structural interchange validator on 6 October 2026: 21 files, `.moc3`, 13 declared expressions and three motion groups (Idle, Tap, Flic). Packaging it with `python3 scripts/cubism_airi_interchange.py package packages/frontend/static/models/miara --identity miara --output <external-path>/miara-generic-airi.zip` created an AIRI import ZIP, with SHA-256 `f27ce4035c3aa27e71c244db6674b5f84c4162e18e4c021b0f9adaecdf1b3ac7`. AIRI's ZIP loader recursively discovers `.model3.json` and resolves paths under a containing folder. This is a **generic Miara package** for import and gesture tuning; archive integrity is not a live render test or proof of a separately authored DTE appearance. Validate usage rights and visual results before public redistribution. An AIRI stage cue must use the hash of the **actually loaded bytes**, not copy this example hash into a different model session.

## Feedback and governance

`SelfModelAvatarFeedback` now rejects missing or non-finite predicted/actual pairs instead of counting a partial readback as zero error. The live avatar sampler compares only fully observed target parameters (excluding dynamic `ParamBreath`); incomplete model readback does **not** increase self-model accuracy. Parameter read-back remains a local calibration signal, **not** proof of actual rendered pixels, a FACS recognition, or a canonical `CoreSelfEvidenceReference`. No proposal is accepted and no identity ledger is mutated by this PR.

Readings with implausible magnitude (above 1,000 in the model's native units) are also rejected before error accumulation; unrelated model parameters are not copied into the training experience. The stage cue lease independently expires by timer if the host ceases polling, and a synchronous host revocation during publish cannot resurrect the cue. Released lease IDs are tombstoned against replay for the adapter's lifetime; after 1,024 retired IDs it refuses more publishes until a new, authenticated adapter session is created.

For later evidence promotion, capture a separately reviewed observation artifact with source URI, immutable commit, relative path, SHA-256 of the actual artifact bytes, model identity and package hash, observed time, expected/read-back values and explicit missing fields. Qualify actual rendered frames independently (e.g. selected expression plus visible pose extrema), compare to read-back, and pass a bounded proposal through the existing core-self policy and reducer preflight. Keep the observation artifact physically separate from the accepted ledger. Revoke the proposal on source/session loss or model mismatch.

## Software-renderer quality budget

The Pixi avatar now detects its **actual** WebGL backend after initialization. Only on a recognized software rasterizer and with no explicit `pixelRatio` preference does it lower the backing-store resolution to DPR 1; hardware WebGL retains its DPR 2 default cap, and an explicit quality preference retains its requested resolution. The existing software-only ticker ceiling stays at 30 FPS. This is a presentation-resource decision, not a cognitive-state or model-asset change.

In a single Sandbox headless Chromium/SwiftShader five-second A/B run on a 482×750 CSS canvas at device DPR 2, the old backing store was 964×1500 and measured requestAnimationFrame cadence was 14.9 Hz with p95 interval 216.7 ms. After software-only downscaling it was 482×750, 42.9 Hz and p95 83.3 ms. These are **browser scheduling samples, not actual Cubism draw-call FPS**; they do not certify Electron hardware speed, visual quality, hidden-tab behavior, or a deployed AIRI stage. Repeat the trace on the user's target GPU/device and inspect avatar sharpness before declaring a performance gain there.

## Acceptance before enabling an AIRI host

1. **Generic character pilot:** import the correctly labeled Miara ZIP first. Verify its attribution/usage rights, actual loaded bytes, texture/expression/Idle motion/physics, yaw/blink/lip-sync and occlusion extrema in AIRI. Later character-specific authoring may refine layered PSD, native `.cmo3`, textures and gestures without blocking the generic-model integration. Structural ZIP validation alone does not prove a working render.
2. **Stage spike:** import the genuine ZIP using AIRI's model selector, validate loaded resources, expressions and motion in the running stage; wire the stage compositor behind a reviewed, authenticated local transport with model-byte digest verification. Do not embed AIRI's Vue stage in DeltEcho React or merge either cognitive engine.
3. **Desktop coexistence:** in isolated DeltEcho and AIRI profiles, test a real local daemon lease, loss and revocation, speech priority, no accidental external messages, and standard Delta Chat messaging. An Electron build or mock does not satisfy this gate.
4. **Matched performance trace:** collect cold load time, steady/hidden FPS, p95 frame time, CPU, VRAM/memory, DPR 1/2 and explicit high-DPR, remount/resource leaks, resize, and model switch before/after on the _same_ machine. Do not infer a GPU improvement from source-level tests or a software renderer.
5. **Delivery:** run frozen install, avatar tests/types/build, whole-repo unit and E2E, targeted CI/deploy workflow checks, and an authorized staging browser smoke. The Cloudflare Access-gated preview cannot be asserted functional without legitimate access.

**Integration alternatives:** neither route confers core-self authority on AIRI. This PR implements both pure cue boundaries, not the transport, stage deployment, or character art.

| Approach                                      | Tradeoffs                                                                                                                                             | Cost                                                      | Setup complexity |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| AIRI stage-host plugin                        | AIRI renders the model with explicit capability/lifecycle ownership; requires an independently reviewed AIRI integration and private local transport. | Additional host/plugin maintenance and runtime resources. | Higher           |
| Manual ZIP import, DeltEcho renderer retained | Simpler asset interoperability and no cross-process cue transport; no shared live-stage control.                                                      | Separate renderers and profile management.                | Lower            |
