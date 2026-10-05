import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Live2DAvatar } from "../Live2DAvatar";

jest.mock("@deltecho/avatar", () => ({
  Live2DAvatarManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockRejectedValue(new Error("model missing")),
    dispose: jest.fn(),
    resize: jest.fn(),
  })),
}));

describe("Live2DAvatar failed overlay", () => {
  it("keeps the Failed banner inside the avatar container", async () => {
    const { container } = render(
      <Live2DAvatar model="miara" width={240} height={320} showError />,
    );

    await waitFor(() => {
      expect(screen.getByText("⚠️ Live2D Failed")).toBeInTheDocument();
    });

    const overlay = container.querySelector(".live2d-error-overlay");
    const host = container.querySelector(".live2d-avatar-container");
    expect(overlay).toBeTruthy();
    expect(host).toBeTruthy();
    expect(host?.contains(overlay)).toBe(true);
    expect((host as HTMLElement).style.overflow).toBe("hidden");
    expect((overlay as HTMLElement).style.maxWidth).toBe("calc(100% - 16px)");
  });
});
