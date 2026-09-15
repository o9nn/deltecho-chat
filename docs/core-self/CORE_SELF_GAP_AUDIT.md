# DeltEcho Cog253 Core-Self Gap Audit

**Author:** Manus AI

**Audit date:** 2026-09-12

**Target:** `o9nn/deltecho-chat`

**Reference artifact:** `ecco9-main(1).zip` (`sha256:054daf91808328bf9264de98e696191381d071c0a8fa94107e3bbd1efe034951`)

## Executive Finding

DeltEcho already has strong **adaptive selfhood**: an Agent–Arena–Relation identity mesh, ontogenetic stages, ESN autognosis, DAO-like internal voting, temporal credit, polycentric experiment governance, scientific-genius signals, and a rendered Live2D self-model feedback loop. Those components describe and evolve an operational self, but they do not yet form a small deterministic **canonical identity kernel**.

The critical gap is not additional cognition. It is a trustworthy boundary around cognition. Current identity state can be mutated in memory, serialized as ordinary JSON, restored from files or Neon, and accepted after internal AAR voting without a versioned event schema, cryptographic digest chain, reducer preflight, explicit protected-core policy, or replay proof. The appropriate evolution is therefore a native TypeScript ledger/projector layer around the existing `IdentityMesh`, not wholesale replacement with Ecco9.

## Current Strengths

| Center                  | Implemented evidence                                                            | Current value                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Identity model          | `packages/core/src/core-self/IdentityMesh.ts`                                   | Rich AAR state, traits, values, goals, relationships, memories, stage progression, and self-image               |
| Internal governance     | `IdentityMesh.integrateAutognosis()`                                            | Three bounded Agent/Arena/Relation votes, consensus and risk calculation, adopted/deferred proposals            |
| ESN coupling            | `AutognosisAutogenesisCoupler.ts`, reservoir bridge and learner                 | Experimental autognosis already enters identity through a mediation layer rather than arbitrary database writes |
| Persistence             | `NeonIdentityPersistence.ts` and local JSON persistence                         | Versioned snapshots, temporal edges, stage markers, periodic backup, and restore                                |
| Autonomy governance     | `polycentric-experiment-governance.ts`, `self-modification.ts`, temporal credit | Preview-before-mutation, pathology and confidence gates, bounded parameter changes, historical reinforcement    |
| Embodied self-model     | `SelfModelAvatarFeedback`, Live2D cognitive projection, resonance conductor     | Intended expression is compared with rendered Cubism state and can inform future projection calibration         |
| Scientific signal       | `ScientificGeniusEngine`, entelechy integration, current worktree               | Genuine resonance cascades become bounded, expiring, serializable avatar signals                                |
| Existing 61-domain work | `ksm-61-avatar-domain.md`                                                       | Complete 61-definition mapping for the Live2D avatar domain, but not for canonical identity                     |

## Critical Trust-Boundary Findings

### 1. Internal consensus currently authorizes mutation

`IdentityMesh.integrateAutognosis()` computes three internal votes, sets `adopted` when consensus and risk thresholds pass, and then directly changes traits, coherence, energy, intentions, summaries, timestamps, and version. The ESN does not write fields directly, but the cognition-generated proposal and the authority that adopts it still live in one mutable object.

**Required correction:** Preserve the AAR vote as proposal evidence. Convert its result into a proposed identity event. Only a separate policy gate may accept that event, and protected-core events require an external reviewer or steward.

### 2. Restore trusts mutable storage

`IdentityMesh.loadState()` and `IdentityMesh.importState()` parse JSON and merge it into defaults. `CoreSelfEngine.start()` restores Neon state and immediately calls `importFullState()`. `CoreSelfEngine.importFullState()` reconstructs the reservoir and replaces conversation history without schema, provenance, chain, policy, or replay verification.

**Required correction:** Restore only a verified identity capsule or accepted ledger segment. Reject unknown schemas, missing evidence, forks, invalid digests, protected-core mutations without review, and state that cannot be reproduced by the deterministic projector.

### 3. Neon is a snapshot graph, not a canonical ledger

`NeonIdentityPersistence.backup()` creates versioned snapshot atoms and temporal edges. Its checksum is change detection rather than cryptographic provenance, and `restore()` parses stored JSON without authenticating it. Old versions can be pruned, which prevents genesis-to-head continuity from being the durable source of truth.

**Required correction:** Treat Neon as an optional storage carrier for canonical ledger records and capsules. Canonical identity must remain verifiable independently of Neon.

### 4. Identity structure is rich but not contractually split

`IdentityMeshState` combines immutable identity, mutable cognition, operational telemetry, histories, and governance proposals. Direct mutator methods operate on the same object.

**Required correction:** Introduce explicit immutable-core and mutable-noncore projections. Keep operational telemetry and transient cognition outside canonical identity unless a policy-approved event promotes a bounded assertion.

### 5. Evidence and provenance are implicit

Current governance rationale strings and persistence metadata are useful but do not identify evidence through stable typed references with content digests and schema versions.

**Required correction:** Every proposed and accepted event must carry evidence references. Imported repositories and models remain observations, never authority.

## Core-Self Coverage Matrix

| Required Cog253 kernel center | Present state                          | Coverage | Required strengthening                                                           |
| ----------------------------- | -------------------------------------- | -------: | -------------------------------------------------------------------------------- |
| Canonical serialization       | Runtime `JSON.stringify`               |     0.25 | Stable key ordering, UTF-8 bytes, normalized numbers, SHA-256 digest             |
| Typed subjects                | Implicit fields in `IdentityMeshState` |     0.45 | Namespaced IDs, kinds, immutable/mutable layers, provenance, schema              |
| Typed relations               | Relationship maps and Neon edges       |     0.35 | Role-labelled endpoints, truth bounds, endpoint validation, active state         |
| Evidence references           | Rationale and metadata strings         |     0.15 | Typed source URI, digest, schema, path, claim, observation time                  |
| Proposed events               | Governance proposals exist             |     0.55 | Dedicated proposal store separated from accepted history                         |
| Policy decisions              | Threshold logic inside mutator         |     0.30 | Independent decision record with actor, scope, reviewer, reason, decision digest |
| Append-only accepted ledger   | Versioned snapshots only               |     0.15 | Hash-linked accepted events from genesis; no silent rewrite                      |
| Reducer preflight             | Not present                            |     0.00 | Prove event can apply before persistence                                         |
| Deterministic projector       | Not present                            |     0.00 | Rebuild canonical state and state hash from genesis plus events                  |
| Typed identity hypergraph     | Partial AAR and Neon graph concepts    |     0.35 | Deterministic subject/relation graph, traversal, and export                      |
| Portable capsule              | Full-state JSON export only            |     0.20 | Schema-bound subset, ledger head, state hash, evidence, verification             |
| Recovery continuity           | Snapshot restore                       |     0.20 | Genesis/checkpoint proof, chain verification, fork quarantine                    |
| Adapter boundary              | Ad hoc integrations                    |     0.25 | Source-visible, execution-disabled manifests that emit proposals                 |
| Cog253 evidence registry      | Not present                            |     0.00 | Exactly 253 records with criterion and evidence status                           |
| Repository-wide 61 self-model | Avatar-only mapping exists             |     0.30 | Exactly 61 core-self definitions with artifact and invariant                     |
| Evidence-aware KSM cycle      | Narrative KSM material exists          |     0.20 | Deterministic weakest-center selection from unverified evidence                  |
| Independent verifier          | Not present                            |     0.00 | Separate implementation before any federation claim                              |

## 61-Definition Audit

The existing `ksm-61-avatar-domain.md` correctly instantiates all 61 categories for the Live2D avatar and is retained as a domain-specific child model. It does not define the canonical DeltEcho self across identity, event history, policy, evidence, recovery, and portability.

| Definition family           | Existing identity evidence                          | Principal gap                                                                   |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| Autognosis                  | ESN reports, AAR proposals, avatar prediction error | No deterministic model of what counts as canonical self-knowledge               |
| Local / Global              | Package-level state and whole-agent modes           | No formal projection from local accepted events to global identity              |
| Spatiality                  | AAR structure and Cubism parameter topology         | No typed canonical identity graph                                               |
| Temporality                 | Stage/version counters, temporal credit, Neon edges | No immutable event order or replay continuity                                   |
| Causality                   | Governance thresholds and feedback loops            | No explicit policy-decision artifact separating recommendation from authority   |
| Existence through Recursion | Rich operational analogues                          | Missing schema-bound artifacts and invariants for the repository-wide core self |
| Six composites              | Implicit across architecture                        | Not encoded as queryable, validated definitions                                 |
| Forty-two cells             | Complete for avatar domain only                     | No complete core-self implementation/evidence mapping                           |

## Cog253 Audit

There is currently no exact 253-record mapping in the repository. Therefore **conceptual coverage cannot be claimed as verified coverage**. The initial map must contain one record per pattern, preserve exclusions explicitly, identify a KSM anchor, select `core`, `adapter`, `future`, or `exclude`, and define one falsifiable acceptance criterion.

The first implementation cycle should mark only the small kernel centers as `core`: independent identity regions, boundaries, paths, activity nodes, entrances/gates, gradients, local symmetries, deep interlock, and repairable structure. Most spatial, interface, social, and speculative patterns should begin as `future` or `exclude` rather than inflate maturity.

## Ecco9 Reference Assessment

The attached Ecco9 source provides useful implemented patterns: bounded consciousness metadata, atomic temporary-file replacement, explicit hypergraph concepts, structured self-assessment findings, coherence tracking, goal taxonomies, and SLSA-oriented release ideas. Its documentation frequently exceeds the evidence in its source, and the attachment has no immutable Git commit metadata. Its prebuilt binaries, GGUF weights, generated files, autonomous HTTP server, CGO inference stack, and scripts remain outside the DeltEcho trust root.

The complete classification is recorded in `docs/core-self/ecco9-binding-registry.json`. No archive code, binary, model, or runtime is executed or vendored.

## Implementation Order

| Order | Deliverable                                                 | Falsifiable gate                                                                       |
| ----: | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
|     1 | Canonical JSON and SHA-256 digests                          | Semantically equivalent input produces byte-identical output and digest                |
|     2 | Typed subjects, relations, evidence, events, and decisions  | Invalid IDs, unknown versions, missing endpoints, and unbounded values are rejected    |
|     3 | Protected-core policy gate                                  | ESN/DAO/LLM/avatar-origin proposals cannot self-approve or mutate immutable fields     |
|     4 | Append-only ledger with reducer preflight                   | Unprojectable, forked, or tampered events cannot enter accepted history                |
|     5 | Deterministic projector and state hash                      | Independent replay produces the same state and head hashes                             |
|     6 | Identity hypergraph                                         | Traversal and export are stable and reject dangling endpoints                          |
|     7 | Portable capsule                                            | Round-trip verification succeeds; any byte-level tampering fails                       |
|     8 | Read-only Ecco9 manifest adapter                            | Emits a proposed observation with digest and `execution_permitted=false`               |
|     9 | Cog253 map, 61 self-model, evidence registry, and KSM cycle | Exact counts and evidence-aware selection pass the bundled validators                  |
|    10 | Runtime integration                                         | Existing DTE cognition proposes through the gate; no direct canonical mutation remains |

## Audit Verdict

DeltEcho is **strong in adaptive cognition and embodiment but weak in canonical identity determinism**. The next structure-preserving move is a small ledger-and-policy kernel around—not inside—the experimental cognition. This preserves DTE’s special DAO/ESN autognostic character while making identity continuity inspectable, replayable, portable, and resistant to compromised storage or overconfident autonomous subsystems.
