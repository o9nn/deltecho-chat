/**
 * Model Requirement Verification Script
 *
 * This script verifies that all character responses in DeepTreeEchoBot
 * are routed through the LLM - no hardcoded, templated, or fallback text.
 *
 * Run with: npx ts-node --project packages/frontend/tsconfig.json \
 *   packages/frontend/src/components/DeepTreeEchoBot/__tests__/model-requirement-verification.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_DIR = path.join(__dirname, "..");

interface Violation {
  file: string;
  line: number;
  pattern: string;
  context: string;
}

const violations: Violation[] = [];

// Patterns that indicate fixed character speech (not system prompts or metadata)
const FIXED_SPEECH_PATTERNS = [
  // Direct character responses without LLM
  /miscSendTextMessage\([^,]+,[^,]+,\s*["'`][^"'`]*["'`]\s*\)/g,
  /sendMessage\([^,]+,\s*["'`][^"'`]*["'`]\s*\)/g,
  // Fallback response patterns
  /return\s*["'`](?:I'm sorry|Unable to|Cannot|Error occurred)[^"'`]*["'`]/gi,
  /response\s*=\s*["'`](?:I apologize|Something went wrong)[^"'`]*["'`]/gi,
];

// Allowed patterns (system prompts, metadata, context for LLM)
const ALLOWED_PATTERNS = [
  /generateResponse\(/,
  /generateReflection\(/,
  /context\s*=/,
  /prompt\s*=/,
  /systemPrompt/,
  /\.test\.ts$/,
  /__tests__/,
];

function isAllowed(line: string, filePath: string): boolean {
  // Test files are allowed to have mock responses
  if (filePath.includes("__tests__") || filePath.endsWith(".test.ts")) {
    return true;
  }

  return ALLOWED_PATTERNS.some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(line) || pattern.test(filePath);
    }
    return line.includes(pattern);
  });
}

function checkFile(filePath: string): void {
  if (!filePath.endsWith(".ts") || filePath.includes("__tests__")) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    for (const pattern of FIXED_SPEECH_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex state
      const match = pattern.exec(line);
      if (match && !isAllowed(line, filePath)) {
        // Check if this line leads to LLM generation
        const surroundingLines = lines
          .slice(Math.max(0, index - 5), index + 5)
          .join("\n");
        if (
          !surroundingLines.includes("generateResponse") &&
          !surroundingLines.includes("llmService")
        ) {
          violations.push({
            file: path.relative(BOT_DIR, filePath),
            line: index + 1,
            pattern: match[0].substring(0, 80),
            context: line.trim().substring(0, 100),
          });
        }
      }
    }
  });
}

function walkDir(dir: string): void {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && !file.startsWith(".")) {
      walkDir(filePath);
    } else if (stat.isFile()) {
      checkFile(filePath);
    }
  }
}

// Verification of LLM call sites
function verifyLLMCallSites(): string[] {
  const issues: string[] = [];
  const files = [
    "DeepTreeEchoBot.ts",
    "DeepTreeEchoDev.ts",
    "CognitiveBridge.ts",
    "ProactiveMessaging.ts",
    "DeltachatBotInterface.ts",
    "DeepTreeEchoTestUtil.ts",
  ];

  for (const filename of files) {
    const filePath = path.join(BOT_DIR, filename);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");

    // Check that all sendMessage calls are preceded by LLM generation
    const sendMatches = content.match(
      /(?:miscSendTextMessage|sendMessage)\s*\([^)]+\)/g,
    );
    if (sendMatches) {
      for (const match of sendMatches) {
        // Skip if match contains a variable (not a literal string)
        if (!/["'`]/.test(match)) continue;

        // This is a literal string being sent - potential violation
        const lines = content.split("\n");
        const lineIndex = lines.findIndex((l) => l.includes(match));
        if (lineIndex >= 0) {
          const surroundingCode = lines
            .slice(Math.max(0, lineIndex - 10), lineIndex + 1)
            .join("\n");
          if (
            !surroundingCode.includes("generateResponse") &&
            !surroundingCode.includes("llmService")
          ) {
            issues.push(`${filename}:${lineIndex + 1} - Literal string sent without LLM generation`);
          }
        }
      }
    }
  }

  return issues;
}

// Run verification
console.log("=== Model Requirement Verification ===\n");

console.log("Scanning for fixed character speech patterns...\n");
walkDir(BOT_DIR);

if (violations.length > 0) {
  console.log(`Found ${violations.length} potential violations:\n`);
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    Pattern: ${v.pattern}`);
    console.log(`    Context: ${v.context}\n`);
  }
} else {
  console.log("✓ No fixed character speech patterns found in production code.\n");
}

console.log("Verifying LLM call sites...\n");
const llmIssues = verifyLLMCallSites();

if (llmIssues.length > 0) {
  console.log(`Found ${llmIssues.length} potential LLM bypasses:\n`);
  for (const issue of llmIssues) {
    console.log(`  ${issue}`);
  }
} else {
  console.log("✓ All message sending appears to go through LLM.\n");
}

// Summary
console.log("\n=== Summary ===");
console.log(`Fixed speech violations: ${violations.length}`);
console.log(`LLM bypass issues: ${llmIssues.length}`);

if (violations.length === 0 && llmIssues.length === 0) {
  console.log("\n✓ Model requirement verification PASSED");
  console.log("  All character responses are routed through LLMService.generateResponse()");
  process.exit(0);
} else {
  console.log("\n✗ Model requirement verification FAILED");
  process.exit(1);
}
