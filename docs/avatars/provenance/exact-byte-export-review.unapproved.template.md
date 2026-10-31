# PR91 exact-byte export review — unapproved template

**Record state:** `unapproved` / no completed DTE Cubism export supplied.

**Purpose:** checklist and capture form for a future completed export. It is not an export approval, redistribution approval, runtime approval, character-rights grant, or verification result.

No actual `.cmo3`, `.moc3`, `model3.json`, texture, motion, expression, physics file, or archive is attached to this template. Do not paste or commit private Cubism project files or source artwork to complete it.

## A. Review intake — all must be true before any approval decision

- [ ] A completed, character-specific Cubism export exists and the actual byte files are accessible to the authorized review process.
- [ ] The source input has a current truthful approved-input attestation for its exact source SHA-256 and relevant acts.
- [ ] Every new/redrawn layer and every third-party component has an evidence-based rights record that covers the requested act.
- [ ] The controlling external records' expiry and revocation state were checked at review time.
- [ ] The final package was structurally checked separately; structural validity is not a rights decision.
- [ ] The package is not merely a renamed/relabelled restricted sample. A different filename, package ID, or archive digest is not evidence of independent authorship.
- [ ] An actual verifier integration exists and validates exact bytes plus the review state before any runtime gate is claimed.

Until every applicable item is met, use schema `status: "authoring_complete_pending_export_review"`, `"unverified"`, `"expired"`, `"revoked"`, or `"legacy_unresolved"` as supported by the evidence — never `runtime_approved`.

## B. Exact export asset inventory

Compute each SHA-256 from the reviewed file bytes. The archive hash is supplemental; it cannot substitute for individual resource coverage.

| Asset ID | Role         | Relative package path          | SHA-256 from actual bytes | Source/rights record ref + digest | Required acts covered | Review result |
| -------- | ------------ | ------------------------------ | ------------------------- | --------------------------------- | --------------------- | ------------- |
| `TBD`    | `model3`     | `TBD`                          | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |
| `TBD`    | `moc3`       | `TBD`                          | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |
| `TBD`    | `texture`    | `TBD`                          | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |
| `TBD`    | `physics`    | `TBD / not used`               | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |
| `TBD`    | `motion`     | `TBD / not used`               | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |
| `TBD`    | `expression` | `TBD / not used`               | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |
| `TBD`    | `archive`    | `TBD / optional final archive` | `TBD`                     | `TBD — restricted ref + digest`   | `TBD`                 | Unreviewed    |

Extend the table for every `model3.json`-referenced texture, motion, expression, physics, pose, display-info, userdata, and other resource that exists in the actual export. A future verifier must inspect those actual references; the current schema/docs do not do so.

## C. Source and legacy boundaries

| Observation                                                                                              | Required handling                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Retained DTE reference source digest: `35e87896b5b28e19aa17d774bf44943a92fa6cf675925230f7e03284f6d8f51a` | Treat as unverified until a separate, current restricted rights record and authorized input review cover exact bytes and relevant acts.                                                                |
| Current DTE MOC3 digest: `e7c9614904068550f6083bbb8d7d3d559a1b33b2c6ed6ba9e4acd92b85f5647a`              | Inventory as `legacy_unresolved` / observed sample-derived provenance. Do not call it a new independent DTE rig, an approved source, or cleared for redistribution without matching reviewed evidence. |

A byte match is useful for integrity and anti-relabel review. It does not, by itself, prove a license violation or a license grant.

## D. Review decision — intentionally blank

| Field                                       | Required entry after a real review                                |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Export review ID                            | `TBD`                                                             |
| Controlled external review record reference | `TBD — restricted`                                                |
| Controlled record SHA-256                   | `TBD`                                                             |
| Reviewer authority basis                    | `TBD — retain private data externally`                            |
| Review timestamp                            | `TBD`                                                             |
| Valid from / expiry                         | `TBD`                                                             |
| Revocation status and check timestamp       | `TBD`                                                             |
| Approved acts                               | `TBD — export, redistribute, runtime only when expressly covered` |
| Attribution / distribution conditions       | `TBD`                                                             |
| Decision                                    | `Unapproved`                                                      |

`runtime_approved` may be recorded only after a real review binds every actual package resource and the exact export bytes to current evidence covering runtime use. The repository currently has no verifier integration that enforces this condition.

## E. Software-license clarification

Purism software's MIT license concerns that software alone. It does not grant character, image, derivative-art, Cubism export, or MOC3 rights; it does not approve the asset inventory above; and it does not itself create/export a `.moc3`. The same distinction applies to unrelated repository or component software licenses.
