import { resolveLive2DModelUrl } from "../Live2DAvatar";

describe("resolveLive2DModelUrl", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("resolves the local miara model next to a file:// desktop page", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL(
        "file:///workspace/packages/target-electron/html-dist/main.html",
      ),
    });

    expect(resolveLive2DModelUrl("miara")).toBe(
      "file:///workspace/packages/target-electron/html-dist/models/miara/miara_pro_t03.model3.json",
    );
    expect(resolveLive2DModelUrl("deep-tree-echo")).toBe(
      "file:///workspace/packages/target-electron/html-dist/models/deep-tree-echo/deep-tree-echo.model3.json",
    );
    expect(resolveLive2DModelUrl("melody")).toBe(
      "file:///workspace/packages/target-electron/html-dist/models/melody/melody.model3.json",
    );
  });

  it("keeps remote presets as absolute https URLs", () => {
    expect(resolveLive2DModelUrl("shizuku")).toMatch(/^https:\/\//);
  });
});
