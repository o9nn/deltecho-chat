import React, { useEffect, useState } from "react";
import type { EmbodimentDiagnostics } from "@deltecho/avatar";
import type {
  CognitiveVisualState,
  Live2DAvatarController,
} from "../AICompanionHub/Live2DAvatar";

export function ScientificEmbodimentLens({
  controller,
  visual,
  daemonConnected,
  expressionLocked,
}: {
  controller: Live2DAvatarController | null;
  visual: CognitiveVisualState;
  daemonConnected: boolean;
  expressionLocked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState<EmbodimentDiagnostics | null>(null);
  useEffect(() => {
    setSample(null);
    if (!open || !controller || expressionLocked) return undefined;
    const read = () => {
      if (document.visibilityState === "hidden") return;
      setSample(controller.getEmbodimentDiagnostics?.() ?? null);
    };
    read();
    const timer = setInterval(read, 1_000);
    document.addEventListener("visibilitychange", read);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", read);
    };
  }, [open, controller, expressionLocked]);

  const observed = sample?.status === "observed";
  const age =
    observed && sample.lastSampleAt !== null
      ? Math.max(0, Math.floor((Date.now() - sample.lastSampleAt) / 1000))
      : null;
  const residuals = observed
    ? [...(sample.residuals ?? [])]
        .sort((a, b) => (b.normalizedError ?? -1) - (a.normalizedError ?? -1))
        .slice(0, 3)
    : [];
  return (
    <details
      className="scientific-embodiment-lens"
      data-testid="scientific-embodiment-lens"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Scientific embodiment lens</summary>
      {open && (
        <div>
          <p>
            Local Cubism parameter readback — not pixel fidelity or proof of
            scientific correctness.
          </p>
          <dl>
            <dt>Daemon projection</dt>
            <dd>{daemonConnected ? "Connected" : "Unavailable"}</dd>
            <dt>Canonical identity</dt>
            <dd>
              {daemonConnected && visual.coreSelf?.initialized === true
                ? "Anchored"
                : "Unverified"}
            </dd>
            <dt>Avatar observation</dt>
            <dd>
              {expressionLocked
                ? "Paused — manual expression"
                : observed
                  ? "Observed"
                  : "Waiting for real parameters"}
            </dd>
            {observed && (
              <>
                <dt>Measured / requested parameters</dt>
                <dd>
                  {sample.observedParameterCount} /{" "}
                  {sample.requestedParameterCount}
                </dd>
                <dt>Samples in this avatar</dt>
                <dd>{sample.sampleCount}</dd>
                <dt>Parameter RMS error (mixed model units)</dt>
                <dd>{sample.rmsError?.toFixed(4) ?? "Unavailable"}</dd>
                <dt>Observation boundary</dt>
                <dd>
                  {sample.observationPhase === "before-model-update"
                    ? "After physics, before Cubism mesh update"
                    : "Unspecified"}
                </dd>
                <dt>Last observation</dt>
                <dd>
                  {age} s ago — last observation, not a continuous measurement
                </dd>
              </>
            )}
          </dl>
          {residuals.length > 0 && (
            <section aria-label="Scientific residual atlas">
              <h4>Scientific residual atlas</h4>
              <p>
                Largest errors relative to each native rig span. This tests
                expression execution, not a conjecture or DAO consensus.
              </p>
              <ul>
                {residuals.map((residual) => (
                  <li key={residual.parameterId}>
                    <code>{residual.parameterId}</code>: requested{" "}
                    {residual.requested.toFixed(3)}, observed{" "}
                    {residual.observed.toFixed(3)};{" "}
                    {residual.normalizedError === null
                      ? "rig span unavailable"
                      : `${(residual.normalizedError * 100).toFixed(
                          1,
                        )}% of rig span`}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!!sample?.unavailableParameterIds.length && (
            <p>
              Unmeasured rig parameters:{" "}
              {sample.unavailableParameterIds.join(", ")}
            </p>
          )}
          <p>
            DAO-like governance and ESN autognosis stay daemon-owned. This lens
            cannot vote, change identity, run experiments, or grant autonomy.
          </p>
        </div>
      )}
    </details>
  );
}
