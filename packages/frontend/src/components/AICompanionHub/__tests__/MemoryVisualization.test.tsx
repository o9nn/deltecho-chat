import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockUseAICompanion = jest.fn();

jest.mock("../AICompanionController", () => ({
  AICompanionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAICompanion: () => mockUseAICompanion(),
}));

jest.mock("3d-force-graph", () => {
  throw new Error("3d-force-graph mocked failure");
});

import MemoryVisualization from "../MemoryVisualization";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("MemoryVisualization load failure", () => {
  beforeEach(() => {
    mockUseAICompanion.mockReturnValue({
      companions: [],
      memories: [],
      searchMemories: async () => [],
    });
  });

  it("announces a graph load failure instead of staying on Building...", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(
        screen.getByText("Consciousness graph failed to load"),
      ).toBeInTheDocument();
    });
  });

  it("declares the graph libraries Retry needs to load", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(__dirname, "../../../../package.json"), "utf8"),
    );
    expect(pkg.dependencies["3d-force-graph"]).toEqual(expect.any(String));
    expect(pkg.dependencies["three-spritetext"]).toEqual(expect.any(String));
  });
});
