# PR91 provenance working records

**Status: documentation only; no rights verifier is integrated.** These templates preserve an evidence trail for a future review. They do not grant rights, prove authority, verify a signature, approve an input, approve an export, or enable runtime use.

This directory deliberately contains no source image, PSD/PSB, Cubism project, MOC3, texture, archive, private agreement, signature, or personal approval data. Keep any actual approval in an access-restricted external record; record only its stable reference and SHA-256 digest after a real review has occurred.

## Current evidence states

| Candidate / observation                                                                      | Exact SHA-256                                                      | Required present state                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Retained DTE reference image (`/home/ubuntu/dte-avatar-2026-10-30/source/dte-reference.png`) | `35e87896b5b28e19aa17d774bf44943a92fa6cf675925230f7e03284f6d8f51a` | `unverified`; no rights holder, permitted act, or approval is recorded here.                                   |
| Current DTE runtime MOC3, byte-identical to the observed Miara sample MOC3                   | `e7c9614904068550f6083bbb8d7d3d559a1b33b2c6ed6ba9e4acd92b85f5647a` | `legacy_unresolved`; do not describe it as an independently original DTE rig or as cleared for redistribution. |

The second row is a byte-identity and provenance observation, not a finding about any person's rights or historic use.

## Operational sequence and boundaries

1. Start with [the unverified rights-record template](rights-record.unverified.template.md). Its `unverified` status and empty allowed-acts field are intentional.
2. Compute the digest from the actual bytes before recording it. For example: `sha256sum -- /path/to/asset`. A matching SHA-256 establishes byte identity only; it does **not** establish ownership, authority, permitted use, provenance, or an active approval.
3. If a genuinely authorized reviewer supplies a restricted external record, use [the input-review template](authorized-input-review.template.md) to capture its reference and digest without publishing the record itself. Until then, leave the input unverified and do not process it as approved.
4. After an actual Cubism export exists, use [the exact-byte export-review template](exact-byte-export-review.unapproved.template.md). It requires separate hashes for the completed package resources; an archive hash never replaces per-file coverage.
5. Do not label a record `runtime_approved` on the basis of these documents. A future verifier must calculate actual bytes, evaluate required acts, and evaluate expiry/revocation before source processing, package acceptance, selection, or redistribution can be called rights-gated.

The repository has no verifier integration for this proposed record format. Consequently, these files and `docs/reviews/pr91-provenance.schema.json` are design/review materials, not an enforcement mechanism. The current schema is useful for a manifest shape, but it does not itself evaluate a private record, an authorization's continuing validity, all model-resource coverage, or anti-relabel evidence.

## Relationship to the proposed schema

Use `docs/reviews/pr91-provenance.schema.json` only where its fields fit the evidence:

- A candidate source or export resource belongs in `assets`, with an exact SHA-256 and an evidence-based `origin_class`.
- The per-asset `rights` object carries a status, external record reference/digest, and `allowed_acts`. `unverified` must retain no permitted acts.
- A truthful approved-input review maps to `approved_input_attestation`; do not create one with invented reviewer data, signatures, dates, or record digests.
- The allowed-act vocabulary is `extract`, `derive`, `rig`, `export`, `redistribute`, and `runtime`. It is a vocabulary for a future reviewed record, not a grant from this repository.

The repository's deliberately unapproved example remains intentionally unusable as approval evidence. Its optional `example_notice` is declared in the schema so strict JSON Schema tooling can parse the negative fixture before an approval policy rejects its `unverified` state.

## License and tool boundary

Purism software's MIT license concerns that software only. It does not supply character-design, image, or derivative-work rights; it does not make an external rights holder's approval; and Purism does not create or export a Cubism `.moc3`. Separately, a software license for this repository or an integration component does not clear an avatar's character or asset rights.

No template in this directory authorizes source extraction, derivative artwork, redrawing, rigging, editor export, public display, redistribution, or runtime use. Those acts require evidence specific to the exact bytes and intended act. This is a technical provenance process description, not legal advice or a conclusion about any asset.

## Files

- [Rights-record template](rights-record.unverified.template.md) — a source-asset record that starts and remains unverified until external evidence is reviewed.
- [Authorized input-review template](authorized-input-review.template.md) — a non-signing capture form for a future authorized review, with no invented approval.
- [Exact-byte export-review template](exact-byte-export-review.unapproved.template.md) — an unapproved checklist for a completed export that does not currently exist.
