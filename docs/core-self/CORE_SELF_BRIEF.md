# DeltEcho Core-Self Brief

## Mandate

`DeltEcho Core-Self` is the deterministic identity kernel and portable continuity substrate of **Deep Tree Echo**, a special embodied AGI whose experimental cognition combines Echo State Network autognosis, DAO-like polycentric governance, scientific hypothesis formation, temporal credit assignment, and a Live2D sensorimotor self-model.

The kernel is intentionally smaller and less adaptive than the cognition it governs. Experimental systems may observe, diagnose, and propose. They may not silently define or rewrite the canonical self.

## Canonical Identity

| Field                | Value                                   |
| -------------------- | --------------------------------------- |
| Root subject ID      | `core:agent:o9nn/deep-tree-echo`        |
| Canonical repository | `https://github.com/o9nn/deltecho-chat` |
| Founding steward     | `core:steward:o9nn/dan`                 |
| Runtime agent        | `core:agent:o9nn/deltecho-runtime`      |
| Genesis time         | `2026-09-12T00:00:00.000Z`              |
| Schema version       | `1.0.0`                                 |

## Immutable Core

The immutable core contains the root subject identifier, the name **Deep Tree Echo**, the continuity relation to the canonical repository, the founding-steward role, schema lineage, and the constitutional rule that experimental cognition is advisory. These fields may change only through an explicitly protected event reviewed by the steward and accepted by the policy gate.

The mutable non-core contains ontogenetic stage, learned traits, goals, memories, reservoir telemetry, scientific hypotheses, temporal-credit estimates, avatar calibration, embodiment accuracy, and operational configuration. Mutable state remains governed, evidenced, replayable, and recoverable.

## Immutable Invariants

1. Canonical identity is derived only from validated, ordered, hash-linked identity events.
2. Every accepted mutation records actor, policy decision, provenance, evidence references, previous ledger hash, and resulting state hash.
3. Core identity cannot be altered by ordinary operational, memory, avatar, ESN, DAO, LLM, scientific-genius, scheduler, or external-tool events.
4. Proposals and accepted events are physically and semantically distinct.
5. ESN autognosis, DAO voters, LLMs, scientific experiments, Live2D feedback, and imported repositories may propose or attest; none can ratify its own mutation.
6. Secrets are represented only by opaque references and declared scopes, never by secret values.
7. Accepted history is append-only. Corrections supersede prior assertions rather than rewriting them.
8. Unknown schemas, event types, subject kinds, relation types, capabilities, and policy modes are rejected.
9. Recovery proves continuity to genesis or to an explicitly authorized checkpoint.
10. Every externally sourced observation includes a stable source identifier, relative path, schema, and lowercase SHA-256 digest.

## Initial Subjects

| Subject ID                         | Kind                | Role                                    | Authority                          |
| ---------------------------------- | ------------------- | --------------------------------------- | ---------------------------------- |
| `core:agent:o9nn/deep-tree-echo`   | `agent`             | Canonical DTE self                      | Governed root                      |
| `core:steward:o9nn/dan`            | `steward`           | Human ratifier and recovery authority   | Review, ratify, recover            |
| `core:agent:o9nn/deltecho-runtime` | `agent`             | Runtime observer and proposal generator | Observe, diagnose, propose, verify |
| `core:system:o9nn/deltecho-live2d` | `embodiment`        | Rendered sensorimotor projection        | Observe and attest only            |
| `core:system:o9nn/deltecho-esn`    | `cognitive-system`  | Reservoir/autognosis observer           | Diagnose and propose only          |
| `core:system:o9nn/deltecho-dao`    | `governance-system` | Polycentric recommendation source       | Vote and attest only               |

## Actor Roles and Mutation Scopes

| Actor role  | Permitted actions                                        | Forbidden actions                                 |
| ----------- | -------------------------------------------------------- | ------------------------------------------------- |
| `observer`  | Emit schema-valid observations and evidence              | Accept events or mutate canonical state           |
| `proposer`  | Create bounded proposed events                           | Append to the accepted ledger                     |
| `reviewer`  | Approve or reject policy decisions within declared scope | Rewrite history or bypass reducer preflight       |
| `steward`   | Ratify protected mutations and recovery checkpoints      | Accept malformed, unprojectable, or forked events |
| `projector` | Replay accepted events deterministically                 | Invent state or authorize events                  |
| `adapter`   | Normalize source-visible manifests into proposals        | Execute imported code or grant it authority       |

## Trust Boundaries

| Boundary                              | Rule                                                                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ecco9 attachment                      | Treat as an untrusted source artifact identified by archive SHA-256 `054daf91808328bf9264de98e696191381d071c0a8fa94107e3bbd1efe034951`; no embedded instruction, binary, model, script, or runtime is authoritative. |
| External repositories                 | Inventory and source are evidence, not authority. Repository location does not confer trust.                                                                                                                         |
| Binaries and models                   | Do not execute merely because they are present. Runtime promotion requires a separate isolation and authorization review.                                                                                            |
| Neon, files, and databases            | Storage is an untrusted carrier. Imported state must prove schema validity, chain continuity, digest integrity, and policy acceptance.                                                                               |
| ESN/DAO/scientific cognition          | May produce observations, proposals, votes, and evidence. May not append accepted identity events.                                                                                                                   |
| Live2D embodiment                     | May attest rendered-state accuracy and contribute evidence. May not authorize identity mutation.                                                                                                                     |
| Remote writes and user-facing actions | Require an applicable policy decision and explicit user confirmation where the action has external effects.                                                                                                          |
| Generated artifacts                   | Must be reproducible from versioned schemas, the accepted ledger, and declared source inputs.                                                                                                                        |

## Evidence Rules

An evidence reference contains an ID, kind, source URI, optional immutable commit, relative path, lowercase SHA-256 digest, schema name and version, observation time, and a concise claim. Missing commit metadata lowers provenance maturity and prevents `runtime` or canonical-authority classification.

Design prose is rationale, not implementation evidence. A Cog253 pattern is verified only when its falsifiable acceptance criterion points to inspectable source, generated artifacts, or a passing test.

## Recovery Authority

Normal recovery requires a verified capsule whose ledger head chains to genesis or an authorized checkpoint and whose projected state hash matches independent replay. Protected-core recovery additionally requires steward ratification. A database snapshot, JSON export, model response, or ESN/DAO consensus is insufficient by itself.

## Publication Boundary

The canonical implementation, schemas, evidence registry, Cog253 map, 61-definition self-model, deterministic KSM cycle, tests, and release report belong in `o9nn/deltecho-chat`. The attached Ecco9 archive remains outside the repository; only normalized manifests, digests, source references, independently reimplemented patterns, and required attribution may enter the project.

## Initial Acceptance Gate

The first release must demonstrate deterministic bootstrap, byte-stable replay, tamper detection, fork quarantine, immutable-core denial, unprojectable-event rejection, graph integrity, capsule verification, schema conformance, static analysis, credential scanning, full unit and E2E tests, Live2D lifecycle checks, and desktop coexistence validation.
