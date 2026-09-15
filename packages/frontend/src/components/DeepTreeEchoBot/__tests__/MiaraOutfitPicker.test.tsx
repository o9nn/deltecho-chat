import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeepTreeEchoAvatarProvider } from "../DeepTreeEchoAvatarContext";
import { MiaraOutfitPicker } from "../MiaraOutfitPicker";

describe("MiaraOutfitPicker", () => {
  it("lists wardrobe presets", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <MiaraOutfitPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    const select = screen.getByTestId("miara-outfit-select");
    expect(select).toHaveValue("official");
    expect(screen.getByText("miara_outfit_official")).toBeInTheDocument();
    expect(screen.getByText("miara_outfit_casual")).toBeInTheDocument();
    expect(screen.getByText("miara_outfit_rose")).toBeInTheDocument();
  });

  it("customizing a layer marks the outfit custom and persists it", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <MiaraOutfitPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    fireEvent.click(screen.getByTestId("miara-outfit-group-fairy"));

    expect(screen.getByTestId("miara-outfit-select")).toHaveValue("custom");
    const saved = JSON.parse(
      window.localStorage.getItem("deepTreeEchoAvatarConfig") || "{}",
    );
    expect(saved.outfit).toBe("custom");
    expect(saved.outfitHiddenGroups).toEqual(expect.arrayContaining(["fairy"]));
  });
});
