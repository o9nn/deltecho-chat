import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ScientificEmbodimentLens } from "../ScientificEmbodimentLens";
import type { Live2DAvatarController } from "../../AICompanionHub/Live2DAvatar";

const sample = {
  status: "observed" as const,
  sampleCount: 3,
  requestedParameterCount: 12,
  observedParameterCount: 9,
  unavailableParameterIds: ["ParamGhost"],
  lastSampleAt: Date.now(),
  rmsError: 0.02,
};
function openLens() {
  const details = screen.getByTestId("scientific-embodiment-lens");
  (details as HTMLDetailsElement).open = true;
  fireEvent(details, new Event("toggle"));
}
describe("ScientificEmbodimentLens", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  it("only samples while open, reports real coverage, and stops on unmount", () => {
    const read = jest.fn(() => sample);
    const controller = {
      getEmbodimentDiagnostics: read,
    } as unknown as Live2DAvatarController;
    const view = render(
      <ScientificEmbodimentLens
        controller={controller}
        visual={{}}
        daemonConnected={false}
        expressionLocked={false}
      />,
    );
    expect(read).not.toHaveBeenCalled();
    openLens();
    expect(read).toHaveBeenCalledTimes(1);
    expect(screen.getByText("9 / 12")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText(/not pixel fidelity/)).toBeInTheDocument();
    expect(screen.getByText(/ParamGhost/)).toBeInTheDocument();
    view.unmount();
    act(() => jest.advanceTimersByTime(3000));
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("does not reuse a locked expression or an unavailable controller as current evidence", () => {
    const read = jest.fn(() => sample);
    const controller = {
      getEmbodimentDiagnostics: read,
    } as unknown as Live2DAvatarController;
    const view = render(
      <ScientificEmbodimentLens
        controller={controller}
        visual={{}}
        daemonConnected={true}
        expressionLocked={true}
      />,
    );
    openLens();
    expect(read).not.toHaveBeenCalled();
    expect(screen.getByText("Paused — manual expression")).toBeInTheDocument();
    view.rerender(
      <ScientificEmbodimentLens
        controller={null}
        visual={{}}
        daemonConnected={false}
        expressionLocked={false}
      />,
    );
    expect(screen.getByText("Waiting for real parameters")).toBeInTheDocument();
    expect(screen.queryByText("9 / 12")).not.toBeInTheDocument();
  });
  it("shows native-frame residuals without treating unknown rig ranges as zero error", () => {
    const controller = {
      getEmbodimentDiagnostics: () => ({
        ...sample,
        observationPhase: "before-model-update",
        residuals: [
          {
            parameterId: "ParamAngleX",
            requested: 0,
            observed: 6,
            delta: 6,
            normalizedError: 0.1,
          },
          {
            parameterId: "ParamEyeLOpen",
            requested: 1,
            observed: 0.7,
            delta: -0.3,
            normalizedError: null,
          },
        ],
      }),
    } as unknown as Live2DAvatarController;
    render(
      <ScientificEmbodimentLens
        controller={controller}
        visual={{}}
        daemonConnected={false}
        expressionLocked={false}
      />,
    );
    openLens();
    expect(
      screen.getByRole("region", { name: "Scientific residual atlas" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/10.0% of rig span/)).toBeInTheDocument();
    expect(screen.getByText(/rig span unavailable/)).toBeInTheDocument();
    expect(
      screen.getByText("After physics, before Cubism mesh update"),
    ).toBeInTheDocument();
  });
  it("shows historical bias and variability without claiming causal calibration improvement", () => {
    const read = jest.fn(() => ({
      ...sample,
      evidenceWindow: {
        status: "observed",
        sampleCount: 2,
        capacity: 32,
        parameters: [
          {
            parameterId: "ParamAngleX",
            count: 2,
            meanSignedError: -0.2,
            variability: 0.1,
            rmsError: Math.sqrt(0.05),
          },
        ],
      },
    }));
    const controller = {
      getEmbodimentDiagnostics: read,
    } as unknown as Live2DAvatarController;
    const view = render(
      <ScientificEmbodimentLens
        controller={controller}
        visual={{}}
        daemonConnected={false}
        expressionLocked={false}
      />,
    );
    openLens();
    expect(
      screen.getByRole("region", { name: "Scientific evidence window" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 \/ 32 recent native observations/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/bias -20.0%, variability 10.0%, RMS 22.4%/),
    ).toBeInTheDocument();
    expect(screen.getByText(/not a controlled experiment/)).toBeInTheDocument();
    view.rerender(
      <ScientificEmbodimentLens
        controller={controller}
        visual={{}}
        daemonConnected={false}
        expressionLocked={true}
      />,
    );
    expect(
      screen.queryByRole("region", { name: "Scientific evidence window" }),
    ).not.toBeInTheDocument();
  });
  it("does not present one sample's variance as established repeatability", () => {
    const controller = {
      getEmbodimentDiagnostics: () => ({
        ...sample,
        evidenceWindow: {
          status: "observed",
          sampleCount: 1,
          capacity: 32,
          parameters: [
            {
              parameterId: "ParamEyeLOpen",
              count: 1,
              meanSignedError: 0.1,
              variability: 0,
              rmsError: 0.1,
            },
          ],
        },
      }),
    } as unknown as Live2DAvatarController;
    render(
      <ScientificEmbodimentLens
        controller={controller}
        visual={{}}
        daemonConnected={false}
        expressionLocked={false}
      />,
    );
    openLens();
    expect(
      screen.getByText(/one sample cannot establish variability/),
    ).toBeInTheDocument();
    expect(screen.getByText(/variability unavailable/)).toBeInTheDocument();
  });
});
