import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  AVATAR_EXPRESSION_CHOICES,
  LIVE_AVATAR_EXPRESSION,
  MIARA_CUBISM_EXPRESSION_NAMES,
  MIARA_EXPRESSION_MAP,
  cubismExpressionFile,
  isMiaraCubismExpressionName,
  resolveAvatarExpression,
} from "../miara-expressions";

const modelDir = join(process.cwd(), "../frontend/static/models/miara");

describe("miara cubism expressions", () => {
  it("registers every shipped expression on the official mesh", () => {
    const model = JSON.parse(
      readFileSync(join(modelDir, "miara_pro_t03.model3.json"), "utf8"),
    ) as {
      FileReferences: {
        Expressions: Array<{ Name: string; File: string }>;
      };
    };
    const names = model.FileReferences.Expressions.map((item) => item.Name);
    expect(names).toEqual([...MIARA_CUBISM_EXPRESSION_NAMES]);
    for (const name of MIARA_CUBISM_EXPRESSION_NAMES) {
      const relative = cubismExpressionFile(name);
      const file = join(modelDir, relative);
      expect(existsSync(file)).toBe(true);
      const parsed = JSON.parse(readFileSync(file, "utf8")) as {
        Type: string;
        Parameters: Array<{ Id: string }>;
      };
      expect(parsed.Type).toBe("Live2D Expression");
      expect(parsed.Parameters.length).toBeGreaterThan(0);
    }
  });

  it("maps avatar faces onto the uploaded Cubism names", () => {
    expect(MIARA_EXPRESSION_MAP.happy).toBe("JOY_01_BroadSmile");
    expect(MIARA_EXPRESSION_MAP.playful).toBe("JOY_02_Laughing");
    expect(MIARA_EXPRESSION_MAP.surprised).toBe("SURPRISE_01_Startled");
    expect(MIARA_EXPRESSION_MAP.concerned).toBe("SADNESS_01_Melancholy");
    expect(MIARA_EXPRESSION_MAP.neutral).toBe("NEUTRAL_Reset");
    expect(isMiaraCubismExpressionName("GENIUS_01_LuminousInference")).toBe(
      false,
    );
  });

  it("resolves live, named, and unknown expression choices", () => {
    expect(resolveAvatarExpression(undefined)).toBe(LIVE_AVATAR_EXPRESSION);
    expect(resolveAvatarExpression("happy")).toBe(LIVE_AVATAR_EXPRESSION);
    expect(resolveAvatarExpression("JOY_01_BroadSmile")).toBe(
      "JOY_01_BroadSmile",
    );
    expect(AVATAR_EXPRESSION_CHOICES.map((choice) => choice.id)).toContain(
      "PHOTO_Awe",
    );
    expect(AVATAR_EXPRESSION_CHOICES[0]?.id).toBe(LIVE_AVATAR_EXPRESSION);
  });
});
