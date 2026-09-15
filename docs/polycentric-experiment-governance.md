# Polycentric Experiment Governance

Deep Tree Echo treats a selected scientific experiment as a **proposal**, not an instruction. The active-inference scheduler ranks falsifiable interventions; `PolycentricExperimentGovernance` decides whether the selected intervention may mutate the causal forge.

## Governance centers

| Center              | Runtime source                              | Safety role                                                  |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Cognitive quorum    | `CognitiveTickProcessor.getDaoConsensus()`  | Requires coherent temporal, ESN, self-image, and goal state  |
| ESN autognosis      | `CognitiveTickProcessor.getEsnAutognosis()` | Restrains action when reservoir health or capacity degrades  |
| Causal evidence     | `CausalHypothesisForge.getVisualState()`    | Includes evidence-vote agreement in the authorization score  |
| Embodied autognosis | Live2D predicted-versus-rendered self-model | Vetoes action only after enough avatar evidence has matured  |
| Metabolism          | `ConceptualMetabolism`                      | Vetoes experiments during energy crisis or low-energy state  |
| Reservoir pathology | `ESNAutognosisReservoir`                    | Hard veto for dead or saturated reservoir states             |
| Peer quorum         | `MultiAgentConsensus`                       | Mandatory for candidates at or above the high-risk threshold |

Every authorization or rejection produces an inspectable certificate containing the candidate, normalized governance inputs, score, peer result, decision reason, and timestamp.

## Deployment model

Peer voting is hosted by the **persistent Node orchestrator webhook server**. The browser-only Cloudflare preview does not replace a persistent CogHood, CogCity, or equivalent orchestrator peer.

Set the following environment variables on each persistent DTE instance:

| Variable               | Example                                                             | Purpose                                                     |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `DTE_INSTANCE_ID`      | `coghood-dte-01`                                                    | Stable identity placed on peer votes                        |
| `DTE_CONSENSUS_PEERS`  | `https://cogcity.example/webhooks,https://dte-lab.example/webhooks` | Comma-separated webhook base URLs for other DTE instances   |
| `DTE_CONSENSUS_SECRET` | a high-entropy shared secret                                        | HMAC-SHA256 authentication for health and proposal requests |

The orchestrator must also have `enableWebhooks: true`. Each peer base URL must expose:

- `GET /consensus/health` relative to the configured webhook base path;
- `POST /consensus/propose` relative to the configured webhook base path.

For the default `/webhooks` base path, a peer URL is therefore typically `https://host.example/webhooks`.

## Fail-closed behavior

The system intentionally remains conservative under partial configuration:

1. If peer endpoints are configured without `DTE_CONSENSUS_SECRET`, peer voting stays disabled.
2. Low-risk experiments may use the local polycentric quorum when all local safety gates pass.
3. High-risk experiments require at least one healthy peer and an approved peer quorum.
4. The eligible voter count is frozen when a proposal opens; peers disappearing mid-vote cannot shrink the denominator and create a self-approval loophole.
5. Governance transport errors reject the experiment before `CausalHypothesisForge.designIntervention()` is called.

## Default authorization policy

| Control                            |       Default |
| ---------------------------------- | ------------: |
| Minimum cognitive consensus        |          0.42 |
| Minimum cognitive autognosis       |          0.38 |
| Minimum mature embodiment accuracy |          0.45 |
| Embodiment maturity confidence     |          0.35 |
| Minimum energy                     |          0.18 |
| Minimum aggregate governance score |          0.50 |
| High-risk peer-quorum threshold    |          0.55 |
| Certificate history                | 128 decisions |

The aggregate authorization score is normalized to `[0, 1]`:

```text
governance =
  0.24 × cognitive consensus
+ 0.20 × cognitive autognosis
+ 0.12 × causal evidence consensus
+ 0.14 × confidence-weighted embodiment grounding
+ 0.12 × reservoir health
+ 0.10 × metabolic energy
+ 0.08 × scheduler governance confidence
```

Embodiment grounding begins at neutral `0.5`. It approaches measured Live2D self-model accuracy only as rendered-frame evidence accumulates, preventing a cold avatar from creating false certainty or false vetoes.

## Security

Use TLS between peers. Keep `DTE_CONSENSUS_SECRET` outside source control and rotate it as one coordinated cluster secret. Health and proposal payloads use `X-Webhook-Signature: sha256=<hmac>`. The webhook server also applies per-endpoint rate limits. Do not point peer URLs at untrusted public services.
