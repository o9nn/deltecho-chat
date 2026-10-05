import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const mockUseAICompanion = jest.fn();

jest.mock("../AICompanionController", () => ({
  AICompanionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAICompanion: () => mockUseAICompanion(),
}));

import MemoryVisualization from "../MemoryVisualization";

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
});
