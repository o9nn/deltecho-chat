import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeepTreeEchoAvatarProvider } from "../DeepTreeEchoAvatarContext";
import { AvatarPersonaStyleControl } from "../AvatarPersonaStyleControl";

beforeEach(() => window.localStorage.clear());

function renderControl() {
  render(
    <DeepTreeEchoAvatarProvider>
      <AvatarPersonaStyleControl />
    </DeepTreeEchoAvatarProvider>,
  );
}

describe("adult-only optional avatar presentation style", () => {
  it("discloses that Lucy is a visual treatment and leaves the actual rig and identity unchanged", () => {
    renderControl();
    expect(
      screen.getByText(/existing Miara-based Cubism model/i),
    ).toBeVisible();
    expect(
      screen.getByText(/does not install the illustrated Lucy rig/i),
    ).toBeVisible();
    expect(
      screen.getByText(/does not.*enable explicit content/i),
    ).toBeVisible();
    const select = screen.getByTestId(
      "avatar-presentation-style",
    ) as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select).toHaveValue("canonical");
    expect(screen.getByTestId("avatar-adult-self-attested")).not.toBeChecked();
  });

  it("requires self-attestation, persists the visual opt-in, and revokes it immediately", () => {
    renderControl();
    const attest = screen.getByTestId("avatar-adult-self-attested");
    const select = screen.getByTestId(
      "avatar-presentation-style",
    ) as HTMLSelectElement;
    fireEvent.click(attest);
    expect(select).toBeEnabled();
    fireEvent.change(select, { target: { value: "lucy-inspired" } });
    expect(select).toHaveValue("lucy-inspired");
    let saved = JSON.parse(
      window.localStorage.getItem("deepTreeEchoAvatarConfig") ?? "{}",
    );
    expect(saved).toMatchObject({
      adultSelfAttested: true,
      presentationStyle: "lucy-inspired",
      identity: "miara",
    });
    fireEvent.click(attest);
    expect(select).toBeDisabled();
    expect(select).toHaveValue("canonical");
    saved = JSON.parse(
      window.localStorage.getItem("deepTreeEchoAvatarConfig") ?? "{}",
    );
    expect(saved).toMatchObject({
      adultSelfAttested: false,
      presentationStyle: "canonical",
    });
  });

  it("sanitizes persisted style when the adult opt-in is missing or false", async () => {
    window.localStorage.setItem(
      "deepTreeEchoAvatarConfig",
      JSON.stringify({
        presentationStyle: "lucy-inspired",
        adultSelfAttested: false,
      }),
    );
    renderControl();
    await waitFor(() =>
      expect(screen.getByTestId("avatar-presentation-style")).toHaveValue(
        "canonical",
      ),
    );
    expect(screen.getByTestId("avatar-presentation-style")).toBeDisabled();
  });

  it("abstains if the avatar context is not mounted", () => {
    render(<AvatarPersonaStyleControl />);
    expect(screen.getByTestId("avatar-adult-self-attested")).toBeDisabled();
    expect(screen.getByTestId("avatar-presentation-style")).toBeDisabled();
  });
});
