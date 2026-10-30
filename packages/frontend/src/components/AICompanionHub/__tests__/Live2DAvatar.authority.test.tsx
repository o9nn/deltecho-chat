import React from "react";
import { render, waitFor } from "@testing-library/react";
import { Live2DAvatar } from "../Live2DAvatar";
import type { CognitiveVisualState } from "../Live2DAvatar";

const mockUpdateCognitiveState = jest.fn();
const mockNamedExpression = jest.fn().mockReturnValue(true);
jest.mock("@deltecho/avatar", () => ({
  Live2DAvatarManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockImplementation(async (_host, props) => {
      props.onLoad?.();
      return {
        setNamedExpression: mockNamedExpression,
        updateLipSync: jest.fn(),
      };
    }),
    updateCognitiveState: mockUpdateCognitiveState,
    updateEmotionalState: jest.fn(),
    dispose: jest.fn(),
    resize: jest.fn(),
  })),
}));

describe("Live2DAvatar manual presentation and authority", () => {
  beforeEach(() => jest.clearAllMocks());
  it("propagates revoked authority while retaining a named expression lock", async () => {
    const live: CognitiveVisualState = {
      mode: "Scientific Genius",
      coreSelf: {
        initialized: true,
        ledgerHead: "ledger",
        projectedStateDigest: "digest",
        acceptedEventCount: 1,
        pendingProposalCount: 0,
      },
      metabolic: {
        metabolicPhase: "resting",
        energyLevel: 0.1,
        anabolicBalance: -0.8,
        isEnergyCrisis: true,
        myelinationProgress: 0.1,
        knowledgeDensity: 2,
      },
    };
    const view = render(<Live2DAvatar cognitiveVisualState={live} />);
    await waitFor(() => {
      expect(mockUpdateCognitiveState).toHaveBeenLastCalledWith(live, {
        presentationLocked: false,
      });
    });
    view.rerender(
      <Live2DAvatar
        cognitiveVisualState={live}
        manualExpression="JOY_01_BroadSmile"
      />,
    );
    await waitFor(() => {
      expect(mockUpdateCognitiveState).toHaveBeenLastCalledWith(live, {
        presentationLocked: true,
      });
    });
    const revoked: CognitiveVisualState = { mode: "Idle", scientificGenius: 0 };
    view.rerender(
      <Live2DAvatar
        cognitiveVisualState={revoked}
        manualExpression="JOY_01_BroadSmile"
      />,
    );
    await waitFor(() => {
      expect(mockUpdateCognitiveState).toHaveBeenLastCalledWith(revoked, {
        presentationLocked: true,
      });
    });
    expect(mockNamedExpression).toHaveBeenLastCalledWith("JOY_01_BroadSmile");
    view.rerender(<Live2DAvatar cognitiveVisualState={revoked} />);
    await waitFor(() => {
      expect(mockUpdateCognitiveState).toHaveBeenLastCalledWith(revoked, {
        presentationLocked: false,
      });
    });
  });
});
