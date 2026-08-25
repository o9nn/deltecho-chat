import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeepTreeEchoAvatarProvider } from "../DeepTreeEchoAvatarContext";
import { AutomeshStudio } from "../AutomeshStudio";

describe("AutomeshStudio", () => {
  it("renders the Melody mapping studio", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <AutomeshStudio />
      </DeepTreeEchoAvatarProvider>,
    );

    expect(screen.getByTestId("automesh-studio")).toBeInTheDocument();
    expect(screen.getByTestId("automesh-train")).toBeInTheDocument();
    expect(screen.getByTestId("automesh-load-melody")).toBeInTheDocument();
  });

  it("asks for a live mesh when inspect runs without a controller", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <AutomeshStudio />
      </DeepTreeEchoAvatarProvider>,
    );

    fireEvent.click(screen.getByTestId("automesh-inspect"));
    expect(screen.getByTestId("automesh-status")).toHaveTextContent(
      "automesh_status_no_mesh",
    );
  });

  it("requires a reference image before training", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <AutomeshStudio />
      </DeepTreeEchoAvatarProvider>,
    );

    fireEvent.click(screen.getByTestId("automesh-train"));
    expect(screen.getByTestId("automesh-status")).toHaveTextContent(
      "automesh_status_need_image",
    );
  });
});
