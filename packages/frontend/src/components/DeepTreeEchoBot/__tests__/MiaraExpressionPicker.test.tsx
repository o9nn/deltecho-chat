import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeepTreeEchoAvatarProvider } from "../DeepTreeEchoAvatarContext";
import { MiaraExpressionPicker } from "../MiaraExpressionPicker";

describe("MiaraExpressionPicker", () => {
  it("lists live plus named Cubism faces", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <MiaraExpressionPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    const select = screen.getByTestId("miara-expression-select");
    expect(select).toHaveValue("live");
    expect(screen.getByText("avatar_expression_smile")).toBeInTheDocument();
    expect(screen.getByText("avatar_expression_surprise")).toBeInTheDocument();
    expect(screen.getByText("avatar_expression_sad")).toBeInTheDocument();
  });

  it("locks a named face and persists it", () => {
    render(
      <DeepTreeEchoAvatarProvider>
        <MiaraExpressionPicker variant="panel" />
      </DeepTreeEchoAvatarProvider>,
    );

    fireEvent.change(screen.getByTestId("miara-expression-select"), {
      target: { value: "PHOTO_Awe" },
    });

    expect(screen.getByTestId("miara-expression-select")).toHaveValue(
      "PHOTO_Awe",
    );
    expect(screen.getByTestId("miara-expression-live")).toBeInTheDocument();
    const saved = JSON.parse(
      window.localStorage.getItem("deepTreeEchoAvatarConfig") || "{}",
    );
    expect(saved.expression).toBe("PHOTO_Awe");
  });
});
