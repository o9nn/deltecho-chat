import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MemoryVisualization from "../MemoryVisualization";

const frontendPkg = require("../../../../package.json") as {
  dependencies: Record<string, string>;
};

jest.mock("../AICompanionController", () => ({
  AICompanionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useAICompanion: () => ({
    companions: [],
    memories: [],
    searchMemories: jest.fn(),
  }),
}));

describe("MemoryVisualization load announcement", () => {
  it("declares the 3D graph libraries so Retry can load them", () => {
    expect(frontendPkg.dependencies["3d-force-graph"]).toBeTruthy();
    expect(frontendPkg.dependencies["three-spritetext"]).toBeTruthy();
  });

  it("announces a load failure instead of staying on Building...", async () => {
    render(<MemoryVisualization />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Consciousness graph failed to load",
      );
    });
    expect(screen.queryByText("Building consciousness graph...")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
