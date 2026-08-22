import { expect, test } from "@playwright/test";

const AVATAR_TIMEOUT = 45_000;

test.describe("Deep Tree Echo Live2D Cubism avatar", () => {
  test("loads Cubism Core and renders the Miara model without fallback", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const avatar = page.locator(".live2d-avatar").last();
    await expect(avatar).toBeVisible({ timeout: AVATAR_TIMEOUT });

    await page.waitForFunction(
      () => {
        const runtimeReady = Boolean(
          (window as typeof window & { Live2DCubismCore?: unknown })
            .Live2DCubismCore,
        );
        const resources = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name);
        const modelReady = resources.some((name) =>
          name.endsWith("/models/miara/miara_pro_t03.moc3"),
        );
        const textureReady = resources.some((name) =>
          name.includes("/models/miara/miara_pro_t03.4096/texture_00.png"),
        );
        const bodyText = document.body.innerText;

        return (
          runtimeReady &&
          modelReady &&
          textureReady &&
          !bodyText.includes("Loading Avatar") &&
          !bodyText.includes("Live2D Failed")
        );
      },
      undefined,
      { timeout: AVATAR_TIMEOUT },
    );

    const canvas = avatar.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveJSProperty("width", 300);
    await expect(canvas).toHaveJSProperty("height", 300);

    const runtimeState = await page.evaluate(() => {
      const resourceNames = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name);
      const canvasElement = document.querySelector(
        ".live2d-avatar canvas",
      ) as HTMLCanvasElement | null;

      return {
        cubismCoreReady: Boolean(
          (window as typeof window & { Live2DCubismCore?: unknown })
            .Live2DCubismCore,
        ),
        hasModelSettings: resourceNames.some((name) =>
          name.endsWith("/models/miara/miara_pro_t03.model3.json"),
        ),
        hasMoc: resourceNames.some((name) =>
          name.endsWith("/models/miara/miara_pro_t03.moc3"),
        ),
        hasTexture: resourceNames.some((name) =>
          name.includes("/models/miara/miara_pro_t03.4096/texture_00.png"),
        ),
        hasPhysics: resourceNames.some((name) =>
          name.endsWith("/models/miara/miara_pro_t03.physics3.json"),
        ),
        canvasArea: canvasElement
          ? canvasElement.width * canvasElement.height
          : 0,
        fallbackPresent: Boolean(
          [...document.images].find((image) =>
            image.src.includes("sprite_neutral.jpg"),
          ),
        ),
      };
    });

    expect(runtimeState).toEqual({
      cubismCoreReady: true,
      hasModelSettings: true,
      hasMoc: true,
      hasTexture: true,
      hasPhysics: true,
      canvasArea: 90_000,
      fallbackPresent: false,
    });

    expect(
      consoleErrors.filter((message) =>
        /Live2D|Cubism|Unknown settings format/i.test(message),
      ),
    ).toEqual([]);
  });
});
