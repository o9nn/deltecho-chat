/**
 * Code Path Audit - Verifies ALL character response paths go through LLM
 *
 * This test reads the actual source files and verifies that every sendMessage
 * call is preceded by an LLM call (generateResponse, generateCharacterResponse,
 * or generateReflection).
 */

import * as fs from "fs";
import * as path from "path";

describe("Code Path Audit - All Character Responses Through LLM", () => {
  const botDir = path.resolve(
    __dirname,
    "../",
  );

  describe("DeepTreeEchoBot.ts", () => {
    const filePath = path.join(botDir, "DeepTreeEchoBot.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    it("generateCharacterResponse routes to llmService.generateResponse", () => {
      const methodMatch = content.match(
        /private async generateCharacterResponse\([^)]+\):\s*Promise<string>\s*\{([^}]+)\}/s,
      );
      expect(methodMatch).toBeTruthy();
      expect(methodMatch![1]).toContain("llmService.generateResponse");
    });

    it("all sendMessage calls are preceded by LLM generation", () => {
      const sendMessageLines: number[] = [];
      lines.forEach((line, i) => {
        if (
          line.includes("await this.sendMessage(") &&
          !line.includes("//")
        ) {
          sendMessageLines.push(i + 1);
        }
      });

      for (const lineNum of sendMessageLines) {
        // Look at the 10 lines before this sendMessage
        const precedingLines = lines
          .slice(Math.max(0, lineNum - 11), lineNum - 1)
          .join("\n");

        const hasLLMCall =
          precedingLines.includes("generateCharacterResponse") ||
          precedingLines.includes("llmService.generateResponse") ||
          precedingLines.includes("llmService.generateReflection") ||
          precedingLines.includes("generateScientificGeniusOverlay");

        if (!hasLLMCall) {
          // Check if the variable being sent was assigned from LLM earlier
          const sendLine = lines[lineNum - 1];
          const varMatch = sendLine.match(/sendMessage\([^,]+,\s*[^,]+,\s*(\w+)/);
          if (varMatch) {
            const varName = varMatch[1];
            // Look back further for this variable's assignment
            const fullPrecedingCode = lines
              .slice(Math.max(0, lineNum - 50), lineNum - 1)
              .join("\n");
            const varAssignment = fullPrecedingCode.includes(
              `${varName} = await this.generateCharacterResponse`,
            ) || fullPrecedingCode.includes(
              `${varName} = await this.llmService.generateResponse`,
            ) || fullPrecedingCode.includes(
              `${varName} += scientificOverlay`,
            );
            expect(varAssignment).toBe(true);
          }
        } else {
          expect(hasLLMCall).toBe(true);
        }
      }
    });

    it("no hardcoded character speech strings", () => {
      // Patterns that would indicate fixed character responses
      const forbiddenPatterns = [
        /return\s*["'](?:I'm sorry|I apologize|Unable to)[^"']*["']/,
        /response\s*=\s*["'](?:Hello|Hi there|Welcome)[^"']*["']/,
        /sendMessage\([^,]+,\s*[^,]+,\s*["'][^"']+["']\s*\)/,
      ];

      for (const pattern of forbiddenPatterns) {
        const matches = content.match(pattern);
        expect(matches).toBeNull();
      }
    });
  });

  describe("DeepTreeEchoDev.ts", () => {
    const filePath = path.join(botDir, "DeepTreeEchoDev.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("all response assignments come from llmService.generateResponse", () => {
      const responseAssignments = content.match(
        /const response = await [^;]+/g,
      );

      if (responseAssignments) {
        for (const assignment of responseAssignments) {
          expect(assignment).toContain("llmService.generateResponse");
        }
      }
    });

    it("no hardcoded return values with character speech", () => {
      const returnStatements = content.match(/return\s*\{[^}]*response:[^}]*\}/g);

      if (returnStatements) {
        for (const stmt of returnStatements) {
          // Should reference a variable, not a literal string
          expect(stmt).not.toMatch(/response:\s*["']/);
        }
      }
    });
  });

  describe("SelfReflection.ts", () => {
    const filePath = path.join(botDir, "SelfReflection.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("reflectOnAspect calls llmService.generateReflection", () => {
      const methodMatch = content.match(
        /public async reflectOnAspect\([^)]+\):\s*Promise<string>\s*\{([\s\S]*?)\n\s{2}\}/,
      );
      expect(methodMatch).toBeTruthy();
      expect(methodMatch![1]).toContain("llmService.generateReflection");
    });

    it("no fixed reflection responses", () => {
      // Should not have any hardcoded reflection text
      expect(content).not.toMatch(
        /return\s*["'](?:I've reflected|My reflection|Upon reflection)[^"']*["']/,
      );
    });
  });

  describe("VisionCapabilities.ts", () => {
    const filePath = path.join(botDir, "VisionCapabilities.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("does not contain simulateImageAnalysis", () => {
      expect(content).not.toContain("simulateImageAnalysis");
    });

    it("does not contain random choice from descriptions", () => {
      expect(content).not.toContain("descriptions[Math.floor");
    });

    it("analyzeImage routes through LLM", () => {
      expect(content).toContain("llmService.generateResponse");
    });
  });

  describe("DeltachatBotInterface.ts", () => {
    const filePath = path.join(botDir, "DeltachatBotInterface.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("welcome messages come from LLM", () => {
      // Should not have hardcoded welcome strings
      expect(content).not.toMatch(
        /sendMessage\([^,]+,\s*`Welcome to the[^`]*`\)/,
      );
      // Should call LLM for welcome
      expect(content).toContain("llmService.generateResponse");
    });
  });

  describe("DeepTreeEchoTestUtil.ts", () => {
    const filePath = path.join(botDir, "DeepTreeEchoTestUtil.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    it("welcome messages come from LLM", () => {
      // Should not have hardcoded welcome strings
      expect(content).not.toMatch(
        /miscSendTextMessage\([^,]+,\s*[^,]+,\s*["'][^"']+["']\s*\)/,
      );
      // Should call LLM for welcome
      expect(content).toContain("llmService.generateResponse");
    });
  });
});
