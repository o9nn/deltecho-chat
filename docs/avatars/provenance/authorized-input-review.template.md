# PR91 authorized input review — blank template

**Template state:** no review has been performed.

**Purpose:** capture the outcome of a future authorized review without publishing a private approval, signature, or agreement. Completing placeholders is not approval; status remains unverified unless a real controlled record is reviewed and the future verifier enforces it.

## Preconditions

- [ ] The candidate file was supplied through an authorized review process.
- [ ] SHA-256 was computed from the exact bytes under review, not copied from a filename, manifest, ZIP, render, or claim.
- [ ] The source asset has an associated rights record with a restricted external reference and digest.
- [ ] The reviewer has authority to make the stated approval decision for the exact intended acts.
- [ ] Expiry and revocation status were checked against the controlling record at review time.
- [ ] Required provider/component and third-party constraints were considered where they affect the requested acts.

If any item is false, do not create an `approved_input_attestation`; retain `unverified` and stop before source processing.

## Candidate binding

| Field                                     | Required value                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Asset ID                                  | `TBD`                                                                                                                   |
| Asset role                                | `source_art` or other supported role                                                                                    |
| Actual path at review                     | `TBD — do not publish a private storage path if restricted`                                                             |
| Actual SHA-256                            | `TBD — 64 lowercase hex characters computed from reviewed bytes`                                                        |
| Expected source digest currently observed | `35e87896b5b28e19aa17d774bf44943a92fa6cf675925230f7e03284f6d8f51a` for the retained DTE reference only; otherwise `TBD` |
| Origin class                              | `TBD — evidence-based only`                                                                                             |
| Intended acts requested                   | `TBD — select only reviewed acts`                                                                                       |

## Restricted review evidence

| Field                                 | Required value                                                |
| ------------------------------------- | ------------------------------------------------------------- |
| Controlled rights-record reference    | `TBD — restricted external reference, not a public agreement` |
| Controlled rights-record SHA-256      | `TBD — hash of exact reviewed record`                         |
| Attestation ID                        | `TBD — issued by the real authorized process`                 |
| Reviewed timestamp                    | `TBD — truthful ISO 8601 timestamp`                           |
| Reviewer identity / authority basis   | `TBD — retain privately if necessary`                         |
| Expiry / next review time             | `TBD`                                                         |
| Revocation state checked              | `TBD — active / revoked / expired / unknown`                  |
| Revocation check source and timestamp | `TBD`                                                         |
| Attribution / notice conditions       | `TBD`                                                         |
| Restrictions or exclusions            | `TBD`                                                         |

Do not enter a personal signature, signature image, private approval text, or consent record into this repository. A reference and digest allow later comparison without turning this template into the approval itself.

## Decision

| Decision field        | Required outcome                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Input-review status   | `TBD — unverified unless all preconditions and actual evidence are satisfied`                                                             |
| Approved schema uses  | `TBD — only from extract, derive, rig, export, redistribute, runtime`                                                                     |
| Authoring-stage limit | At most `authoring_only_approved_input` after real evidence is verified; this template cannot authorize an export or runtime use.         |
| Blocking condition    | Any mismatch, missing evidence, unknown/revoked/expired state, unauthorised reviewer, or missing intended-act coverage blocks processing. |

A review for `extract` or `derive` is not a review for `rig`, `export`, `redistribute`, or `runtime`. The exact output bytes require a separate export review.

## Proposed schema mapping after genuine review

Only when the controlled review above is real and current, a manifest may contain an `approved_input_attestation` with:

```json
{
  "attestation_id": "TBD",
  "asset_sha256": "TBD",
  "reviewed_at": "TBD",
  "review_record_ref": "restricted-external-record:TBD",
  "review_record_sha256": "TBD",
  "approved_uses": ["TBD"]
}
```

This is a field-shape example only. It must not be copied with invented values and is not checked by a repository verifier today.
