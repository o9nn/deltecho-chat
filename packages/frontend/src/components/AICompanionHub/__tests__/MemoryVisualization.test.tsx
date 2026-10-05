import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MemoryVisualization from "../MemoryVisualization";

jest.mock("../AICompanionController", () => ({
  useAICompanion: () => ({
    companions: [],
    memories: [],
    searchMemories: jest.fn().mockReturnValue([]),
  }),
  AICompanionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock(
  "3d-force-graph",
  () => {
    throw new Error("3D graph unavailable");
  },
  { virtual: true },
);

jest.mock("three", () => ({}), { virtual: true });

describe("MemoryVisualization", () => {
  it("announces a dependency failure and offers retry instead of staying on the loading copy", async () => {
    render(<MemoryVisualization />);

    await waitFor(() => {
      expect(
        screen.getByText("Consciousness graph failed to load"),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Building consciousness graph..."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("3D graph unavailable")).toBeInTheDocument();
  });
});
