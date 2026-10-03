# Evidence-gated scientific avatar

**Author:** Manus AI

## Problem

The browser-safe `CognitiveBridge` currently infers scientific genius, DAO consensus, ESN coherence, autognosis resonance, experimental rigor, and metabolic health from message sentiment and relevance alone. The mounted Live2D display treats that local guess as a cognitive signal and can select the Scientific Genius mode without any Entelechy measurement. Meanwhile, the backend already has a real scientific/ESN/DAO visual snapshot and a genuine resonance event, but the renderer-local bridge must not misrepresent heuristics as that evidence.

## Decision

Introduce a non-cryptographic, explicit `origin` discriminator: `entelechy` for the actual backend signal and `local-observation` for browser-local sentiment/relevance. Local observations may affect salience, valence, arousal, attention, and ordinary responsive animation. They cannot assert scientific genius, DAO/ESN consensus, autognosis, causal rigor, metabolism, core-self acceptance, or a resonance cascade. The real backend remains the sole source of those claims.

The renderer-local bridge accepts only explicitly marked, well-formed backend signals as authoritative. It retains such a signal across local message processing for a short bounded freshness window, then returns to the locally observed neutral state; a null update revokes it immediately. The mounted display reads the discriminator and never forwards a local observation as scientific evidence or a genuine eureka event. These are application-level provenance semantics, not a security claim about cryptographic authentication of the IPC transport.

## Acceptance criteria

| Scenario                                      | Expected behavior                                                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Renderer initializes without backend          | Neutral scientific metrics; no DAO/ESN/autognosis claims or cascade; avatar remains responsive to salience and emotion           |
| Highly urgent, emotional local message        | Attention and mood change, but neither Scientific Genius mode nor synthetic DAO/ESN/metabolic/causal evidence appears            |
| Explicit valid Entelechy signal               | Existing rich mode, metric, core-self, metabolism, and genuine resonance forwarding remains intact                               |
| Local message during a fresh Entelechy signal | Latest real signal remains authoritative; message observation still updates emotional context                                    |
| Backend signal expires or is revoked          | Scientific claims and resonance are removed; ordinary avatar movement continues                                                  |
| Unmarked or malformed signal                  | Fail closed; no elevation of local heuristics into authoritative evidence                                                        |
| Lifecycle and performance                     | No new frame ticker, WebGL context, network call, or background scheduling; source transition captured by avatar state signature |

The feature does not start or alter the orchestrator daemon, grant autogenesis mutation, change DAO voting math, or claim that the separately deployed backend is automatically connected to the Electron renderer. That transport remains an explicit integration boundary.
