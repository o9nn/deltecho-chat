# AIRI stage cues — outbound, revocable presentation bridge

**Status:** source-level adapter and tests, not an installed AIRI plugin, live stage connection, or new character export. This design is reusable for a character whose native Cubism assets and usage rights have been independently verified. The existing Lucy UV atlas and Hiyori/Miara samples are **not** such an export; see [Lucy's authoring contract](lucy/CONVERSION_AND_AIRI.md).

## Boundary

```text
private DTE daemon + accepted core-self (authoritative inside DTE only)
  → local authenticated/leased cognitive broker (host responsibility)
  → projectDTEchoCognitiveState (presentation prediction)
  → AiriStageCueAdapter (bounded, ephemeral, outbound only)
  → AiriStageCueSink (future local AIRI plugin/host implementation)
  → imported, identity-verified Live2D stage
```

The adapter lives at `packages/avatar/src/adapters/airi-stage-cue-adapter.ts`. It has **no** AIRI dependency, socket, credential, Delta Chat profile access, model loader, or core-self write path. The stage host supplies the selected **actual** model ID, its lowercase SHA-256 digest, and expression/motion names read from that model's manifest. A string match is not a cryptographic attestation: the host must validate the model bytes and authenticate the private local DTE session before constructing a lease. A source label alone never proves authority.

Its sink has only `publish(cue)` and `release(leaseId)`. Only normalized eye/head/body pose axes, and model-declared named expressions/motions, can leave DTE. Unknown Cubism parameters and the whole cognitive input are dropped. **Mouth, audio levels, translations, messages, secrets, and canonical identity events are not transportable cues.** When speech is active, named expression and motion are withheld too; the local audio/lip-sync owner retains mouth priority. Absent core-self initialization, wrong model digest/ID, stale or future observations, non-finite values, malformed lease, or an expired lease cause a fail-closed rejection. Duplicate/out-of-order samples cannot replay. A new lease releases the old one before publishing, and disposal/revocation/timeout releases only DTE-owned stage controls. The stage sink must independently enforce `expiresAt` and revoke controls on transport loss; it must never treat a cue as an instruction to reset the entire AIRI stage.

AIRI's [MAGIC driver Pose axes](https://github.com/moeru-ai/airi/blob/main/packages/model-driver-magic-live2d/src/pose.ts) inform the subset used here, but [`@proj-airi/model-driver-magic-live2d`](https://github.com/moeru-ai/airi/blob/main/packages/model-driver-magic-live2d/package.json) is private. Its `Target.apply(Pose)` requires a **complete** pose, including mouth; passing this sparse cue directly to that target would steal audio ownership. Implement a separately reviewed stage-side compositor that merges DTE-owned axes with AIRI's live pose and audio, plus a capability-scoped transport. AIRI has a [plugin protocol](https://github.com/moeru-ai/airi/tree/main/packages/plugin-protocol), but no stage-cue event contract was identified in the inspected event types on 6 October 2026. Do not publish arbitrary plugin events or claim protocol compatibility before a real host integration test.

## Feedback and governance

`SelfModelAvatarFeedback` now rejects missing or non-finite predicted/actual pairs instead of counting a partial readback as zero error. The live avatar sampler compares only fully observed target parameters (excluding dynamic `ParamBreath`); incomplete model readback does **not** increase self-model accuracy. Parameter read-back remains a local calibration signal, **not** proof of actual rendered pixels, a FACS recognition, or a canonical `CoreSelfEvidenceReference`. No proposal is accepted and no identity ledger is mutated by this PR.

Readings with implausible magnitude (above 1,000 in the model's native units) are also rejected before error accumulation; unrelated model parameters are not copied into the training experience. The stage cue lease independently expires by timer if the host ceases polling, and a synchronous host revocation during publish cannot resurrect the cue.

For later evidence promotion, capture a separately reviewed observation artifact with source URI, immutable commit, relative path, SHA-256 of the actual artifact bytes, model identity and package hash, observed time, expected/read-back values and explicit missing fields. Qualify actual rendered frames independently (e.g. selected expression plus visible pose extrema), compare to read-back, and pass a bounded proposal through the existing core-self policy and reducer preflight. Keep the observation artifact physically separate from the accepted ledger. Revoke the proposal on source/session loss or model mismatch.

## Acceptance before enabling an AIRI host

1. **Character provenance:** artist-approved layered art, native `.cmo3`, a character-owned `.moc3`/`.model3.json`, local textures, named expressions and Idle motion; attribution/usage rights. Run `python3 scripts/cubism_airi_interchange.py validate <folder> --identity <name>` then package to a fresh external path. Structural ZIP validation alone does not prove a working render.
2. **Stage spike:** import the genuine ZIP using AIRI's model selector, validate loaded resources, expressions and motion in the running stage; create a capability-scoped host sink that enforces model digest and cue expiry. Do not embed AIRI's Vue stage in DeltEcho React or merge either cognitive engine.
3. **Desktop coexistence:** in isolated DeltEcho and AIRI profiles, test a real local daemon lease, loss and revocation, speech priority, no accidental external messages, and standard Delta Chat messaging. An Electron build or mock does not satisfy this gate.
4. **Matched performance trace:** collect cold load time, steady/hidden FPS, p95 frame time, CPU, VRAM/memory, DPR 1/2 and explicit high-DPR, remount/resource leaks, resize, and model switch before/after on the _same_ machine. Do not infer a GPU improvement from source-level tests or a software renderer.
5. **Delivery:** run frozen install, avatar tests/types/build, whole-repo unit and E2E, targeted CI/deploy workflow checks, and an authorized staging browser smoke. The Cloudflare Access-gated preview cannot be asserted functional without legitimate access.

**Integration alternatives:** neither route confers core-self authority on AIRI. This PR implements the common outbound cue contract, not the host deployment.

| Approach                                      | Tradeoffs                                                                                                                            | Cost                                                      | Setup complexity |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------- |
| AIRI stage-host plugin                        | AIRI renders the model with explicit capability/lifecycle ownership; requires a reviewed cue compositor and private local transport. | Additional host/plugin maintenance and runtime resources. | Higher           |
| Manual ZIP import, DeltEcho renderer retained | Simpler asset interoperability and no cross-process cue transport; no shared live-stage control.                                     | Separate renderers and profile management.                | Lower            |
