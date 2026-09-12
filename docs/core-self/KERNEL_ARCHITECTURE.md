# DeltEcho Deterministic Core-Self Kernel

## Architectural Intent

The DeltEcho core-self kernel is a small deterministic authority boundary around the existing adaptive `IdentityMesh`. It does not replace ESN autognosis, DAO-like voting, scientific-genius experiments, temporal credit, memory, or Live2D embodiment. It determines which identity assertions become canonical and makes that decision replayable.

> Experimental cognition proposes. Policy decides. The ledger remembers. The projector reconstructs. The avatar embodies but does not authorize.

The kernel is dependency-minimal TypeScript inside `packages/core/src/core-self/kernel`. It uses stable JSON contracts and SHA-256 content digests. Database, filesystem, model, network, renderer, and wall-clock dependencies remain outside deterministic projection.

## Module Boundary

| Module                      | Responsibility                                                                                                                   | Forbidden behavior                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `canonical.ts`              | Validate canonical JSON, sort object keys, encode UTF-8, compute SHA-256                                                         | Runtime-dependent key order, non-finite numbers, `undefined`, functions, or implicit class serialization |
| `contracts.ts`              | Define and validate subjects, relations, evidence, events, proposals, decisions, state, and capsules                             | Unknown schema versions, unbounded truth values, malformed identifiers                                   |
| `policy.ts`                 | Evaluate actor role, scope, mutation mode, immutable paths, reviewer quorum, and recovery rules                                  | Applying mutations or persisting events                                                                  |
| `projector.ts`              | Preflight and apply one accepted event to an immutable state copy                                                                | Authorization, I/O, time access, hidden mutation                                                         |
| `ledger.ts`                 | Separate proposals from accepted events, enforce previous-hash continuity, append only after preflight, replay deterministically | Rewriting accepted history or accepting a fork                                                           |
| `hypergraph.ts`             | Build and traverse typed subject/relation projections                                                                            | Dangling endpoints or untyped adjacency                                                                  |
| `capsule.ts`                | Export and verify portable canonical subsets                                                                                     | Treating an arbitrary snapshot as authoritative                                                          |
| `ecco9-manifest-adapter.ts` | Normalize the source-visible Ecco9 binding registry into a proposed observation                                                  | Importing modules, executing binaries/scripts/models, or appending accepted events                       |
| `index.ts`                  | Publish the kernel’s stable public API                                                                                           | Exporting mutable internal containers                                                                    |

## Canonical JSON

Canonical values are `null`, booleans, finite numbers, strings, arrays of canonical values, and objects whose values are canonical. Object keys are sorted lexicographically. Arrays retain order. Serialization emits compact UTF-8 JSON with no insignificant whitespace.

Numbers must be finite and must not be negative zero. Strings remain Unicode strings; callers are responsible for supplying semantically normalized identifiers. Unknown object prototypes, dates, buffers, maps, sets, bigints, functions, symbols, `undefined`, cyclic graphs, sparse arrays, and accessors are rejected rather than coerced.

The digest function is lowercase hexadecimal SHA-256 over the canonical UTF-8 bytes.

## Identifiers

| Contract | Grammar                                |
| -------- | -------------------------------------- |
| Subject  | `core:<kind>:<scope>/<name>`           |
| Relation | `rel:<type>:<scope>/<name>`            |
| Evidence | `evidence:<kind>:<scope>/<name>`       |
| Proposal | `proposal:<event-type>:<scope>/<name>` |
| Event    | `event:<event-type>:<scope>/<name>`    |
| Decision | `decision:<mode>:<scope>/<name>`       |
| Capsule  | `capsule:<scope>/<name>`               |

Identifiers use lowercase ASCII letters, digits, `.`, `_`, and `-` within segments. Empty segments, traversal syntax, whitespace, and ambiguous separators are rejected.

## Subjects

A `CoreSelfSubject` declares a stable identifier, kind, display name, immutable core, mutable layers, lifecycle status, aliases, provenance, and schema version.

The root DTE subject immutable core contains:

- canonical name `Deep Tree Echo`;
- canonical repository `https://github.com/o9nn/deltecho-chat`;
- founding steward `core:steward:o9nn/dan`;
- constitutional rule `experimental-cognition-proposes-policy-authorizes`;
- genesis schema lineage.

Operational identity fields—traits, goals, stage, summaries, relationships, resonance, embodiment calibration, and reservoir metrics—remain mutable only through event types explicitly allowed by policy.

## Relations

A `CoreSelfRelation` contains a stable identifier, declared relation type, at least two role-labelled endpoints, truth strength and confidence in `[0,1]`, provenance, active status, and schema version. Projector preflight rejects any relation whose endpoint subject is absent from the projected state.

## Evidence

A `CoreSelfEvidenceReference` contains:

| Field          | Requirement                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `id`           | Stable evidence identifier                                                                            |
| `kind`         | Source, test, observation, approval, or artifact                                                      |
| `sourceUri`    | Repository, attachment, test, or local artifact URI without credentials                               |
| `commit`       | Full immutable source commit when available; otherwise omitted with reduced maturity                  |
| `relativePath` | Source-relative path without traversal                                                                |
| `sha256`       | Lowercase 64-character digest                                                                         |
| `schema`       | Named schema and version                                                                              |
| `observedAt`   | Normalized ISO-8601 metadata; excluded from deterministic event identity unless semantically required |
| `claim`        | Concise falsifiable statement supported by the evidence                                               |

Evidence does not authorize an event. It supports a policy decision.

## Proposals and Accepted Events

A proposal is an immutable envelope around an unsigned candidate event. It records proposer, rationale, evidence, and the ledger head against which it was created. Proposals live in a collection separate from accepted history.

An accepted event contains:

- schema version and event ID;
- event type and target subject;
- actor and declared capability;
- occurrence and observation timestamps;
- source reference and evidence references;
- bounded canonical payload;
- policy decision;
- previous accepted-event digest;
- event digest;
- optional signature metadata.

Event identity is derived from canonical event content excluding `eventDigest`, then verified on import. A proposal never becomes accepted by changing a status flag in place; acceptance creates a new accepted-event record linked to the proposal digest and decision.

## Initial Event Vocabulary

| Event type                 | Purpose                                                   | Default mode             |
| -------------------------- | --------------------------------------------------------- | ------------------------ |
| `identity.genesis`         | Register the root subject and constitutional invariants   | `recovery` with steward  |
| `subject.register`         | Add a non-root subject                                    | `standard`               |
| `subject.patch`            | Patch explicitly mutable subject fields                   | `standard`               |
| `identity.protected-patch` | Change immutable-core fields                              | `protected` with steward |
| `relation.assert`          | Add or replace a typed relation after endpoint validation | `standard`               |
| `relation.retract`         | Mark a relation inactive without deleting history         | `standard`               |
| `evidence.observe`         | Register an evidence reference                            | `observation`            |
| `governance.attest`        | Record DAO/ESN/avatar/scientific recommendation evidence  | `observation`            |
| `checkpoint.authorize`     | Authorize a recovery checkpoint                           | `recovery` with steward  |

Unknown event types are rejected.

## Policy Decisions

A `CoreSelfPolicyDecision` is a separately digested record with mode `observation`, `standard`, `protected`, or `recovery`, outcome `accept`, `reject`, or `quarantine`, actor, capability, reviewer IDs, rationale, evaluated proposal digest, and policy version.

| Mode          | Minimum authorization                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `observation` | Registered observer or adapter; no canonical identity mutation                 |
| `standard`    | Registered proposer plus one independent reviewer; mutable paths only          |
| `protected`   | Founding steward or configured steward quorum; explicitly protected event type |
| `recovery`    | Steward approval and verified continuity to genesis or authorized checkpoint   |

A proposer cannot be its sole reviewer. ESN, DAO, LLM, scientific-genius, scheduler, Ecco9 adapter, and Live2D actors have observation/proposal capabilities only.

## Immutable-Core Policy

The projector rejects any standard patch targeting:

- `/immutable/id`;
- `/immutable/name`;
- `/immutable/canonicalRepository`;
- `/immutable/foundingSteward`;
- `/immutable/constitution`;
- `/schemaVersion`.

Only `identity.protected-patch` with a valid protected decision may target these paths. Unknown JSON Pointer paths and prototype-sensitive keys such as `__proto__`, `prototype`, and `constructor` are rejected.

## Append-Only Ledger

The ledger owns two physically distinct arrays: `proposals` and `acceptedEvents`. Submission validates and digests a proposal but cannot change projected state. Acceptance performs the following order:

1. Validate proposal and decision schemas.
2. Verify proposal and decision digests.
3. Confirm decision targets the proposal digest.
4. Confirm actor capability, mode, reviewer independence, and immutable-path policy.
5. Confirm the candidate event’s previous digest equals the accepted head.
6. Run projector preflight against the current state.
7. Build and verify the accepted event digest.
8. Append the event.
9. Replace the current projection with the preflight result.

No event is persisted before step 6 succeeds. A previous-hash mismatch produces a quarantined fork record, never implicit rebasing.

## Deterministic Projection

Projection begins from an empty state and accepts `identity.genesis` only at ledger position zero. Each subsequent event returns a new state value. Projection has no I/O, random source, timers, process state, locale dependence, or hidden singleton state.

The projected state contains ordered subject and relation maps, registered evidence, last accepted event digest, event count, and schema version. Stable export sorts map keys through canonical serialization. The state hash is the SHA-256 digest of the canonical projected state.

## Typed Identity Hypergraph

Subjects are vertices. Relations are typed hyperedges with role-labelled endpoints. Traversal accepts a start subject, optional relation type, optional role, direction, and maximum depth. Results are ordered by relation ID and subject ID so equivalent graphs produce byte-identical exports.

A relation is accepted only when every endpoint exists, endpoint roles are unique inside that relation, truth values are bounded, and the relation schema version is known.

## Portable Capsules

A `CoreSelfCapsule` contains capsule ID, schema version, root subject ID, selected subjects and relations, accepted ledger segment or checkpoint proof, ledger-head digest, projected-state digest, evidence references, source repository and commit, creation metadata, and capsule digest.

Verification recomputes every contained digest, replays the ledger segment or validates the authorized checkpoint, projects the included graph, and compares the resulting hashes. Any mismatch rejects the capsule without partial import.

## Ecco9 Manifest Adapter

The initial adapter consumes only the normalized registry in `docs/core-self/ecco9-binding-registry.json`. It validates schema version, archive digest, binding modes, source paths, capability descriptions, and `execution_permitted=false`. It emits one `evidence.observe` proposal that records the registry digest and classification summary.

The adapter does not access the extracted archive, import Go/Python modules, execute binaries, load GGUF files, start servers, or write to the accepted ledger.

## Integration with Existing DTE Cognition

The existing `IdentityMesh` remains the rich adaptive state model during migration. Its AAR governance output becomes `governance.attest` evidence and a bounded proposal rather than automatic canonical acceptance. Core-self state import and Neon restore must pass capsule or ledger verification before updating the identity mesh.

Scientific-genius resonance and Live2D rendered-state feedback remain transient observations. Their metrics may support proposals, temporal credit, and policy decisions, but the renderer and cognitive engines cannot review or accept their own events.

## Acceptance Matrix

| Invariant             | Required test                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Canonical determinism | Differently ordered equivalent objects produce identical bytes and SHA-256 digest                             |
| Canonical rejection   | Cycles, sparse arrays, `undefined`, non-finite numbers, negative zero, and unsupported prototypes fail closed |
| Schema conformance    | Unknown versions and kinds are rejected                                                                       |
| Proposal separation   | Submitting a proposal leaves accepted head and projected state unchanged                                      |
| Reviewer independence | A proposer acting as sole reviewer is rejected                                                                |
| Immutable protection  | Standard events cannot change immutable-core paths                                                            |
| Reducer preflight     | Unprojectable events never enter the accepted ledger                                                          |
| Fork detection        | A stale previous digest is quarantined and does not alter state                                               |
| Replay equivalence    | Replaying accepted events produces identical state and head hashes                                            |
| Tamper detection      | Any accepted-event byte change invalidates its digest and chain                                               |
| Graph integrity       | Missing endpoints and duplicate endpoint roles are rejected                                                   |
| Capsule portability   | Export/verify/import round trip preserves state and ledger hashes                                             |
| Adapter restraint     | Ecco9 adapter emits a proposal and cannot execute or accept anything                                          |
| ESN/DAO restraint     | Experimental cognition cannot self-review or mutate protected identity                                        |
| Embodiment restraint  | Live2D feedback can attest but not authorize identity mutation                                                |

## Migration Strategy

The first implementation is additive. Existing identity behavior remains operational while the kernel records and verifies a canonical identity projection. Direct raw import is then guarded behind verified capsule import. Only after replay and recovery tests are stable should ordinary identity mutations be routed exclusively through accepted events.
