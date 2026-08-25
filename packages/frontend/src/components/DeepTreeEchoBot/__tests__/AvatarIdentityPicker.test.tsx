import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeepTreeEchoAvatarProvider } from "../DeepTreeEchoAvatarContext";
import { AvatarIdentityPicker } from "../AvatarIdentityPicker";

describe("AvatarIdentityPicker", () => {
  it("lists Miara plus the two mesh variants", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <AvatarIdentityPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    expect(screen.getByTestId("avatar-identity-miara")).toBeInTheDocument();
    expect(
      screen.getByTestId("avatar-identity-deep-tree-echo"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("avatar-identity-melody")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-identity-miara")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("applies the Deep Tree Echo grove look and persists it", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <AvatarIdentityPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    fireEvent.click(screen.getByTestId("avatar-identity-deep-tree-echo"));

    expect(
      screen.getByTestId("avatar-identity-deep-tree-echo"),
    ).toHaveAttribute("aria-checked", "true");
    const saved = JSON.parse(
      window.localStorage.getItem("deepTreeEchoAvatarConfig") || "{}",
    );
    expect(saved.identity).toBe("deep-tree-echo");
    expect(saved.model).toBe("miara");
    expect(saved.outfit).toBe("grove");
    expect(saved.outfitHueShift).toBe(95);
  });

  it("applies the Melody aria look on the same mesh", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <AvatarIdentityPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    fireEvent.click(screen.getByTestId("avatar-identity-melody"));

    const saved = JSON.parse(
      window.localStorage.getItem("deepTreeEchoAvatarConfig") || "{}",
    );
    expect(saved.identity).toBe("melody");
    expect(saved.model).toBe("miara");
    expect(saved.outfit).toBe("aria");
    expect(saved.outfitHueShift).toBe(0);
    expect(saved.outfitHiddenGroups).toEqual(
      expect.arrayContaining(["water", "background"]),
    );
  });
});
