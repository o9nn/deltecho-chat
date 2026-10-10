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
});
