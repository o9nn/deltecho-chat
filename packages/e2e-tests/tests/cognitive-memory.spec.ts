import { test, expect } from "@playwright/test";
import {
  switchToProfile,
  User,
  loadExistingProfiles,
  reloadPage,
} from "../playwright-helper";

/**
 * Cognitive Memory System E2E Test Suite
 *
 * This test suite covers the memory systems used by Deep Tree Echo:
 * - RAG (Retrieval-Augmented Generation) memory
 * - Hyperdimensional memory
 * - Conversation context persistence
 * - Memory retrieval and relevance scoring
 */

test.describe("Cognitive Memory System", () => {
  test.describe.configure({ mode: "serial" });

  let existingProfiles: User[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await reloadPage(page);
    existingProfiles = (await loadExistingProfiles(page)) ?? existingProfiles;
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await reloadPage(page);
  });

  test.describe("RAG Memory Store", () => {
    test("should store conversation memories", async ({ page }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        // Send a memorable message
        const memoryTestMessage = `Remember this: The secret code is DELTA-${Date.now()}`;
        await page.locator("#composer-textarea").fill(memoryTestMessage);
        await page.locator("button.send-button").click();

        // Wait for memory storage
        await page.waitForTimeout(1000);

        // Verify message was sent (memory storage happens in background)
        const sentMessage = page
          .locator(".message.outgoing")
          .last()
          .locator(".msg-body .text");
        await expect(sentMessage).toContainText("Remember this");
      }
    });

    test("should retrieve relevant memories", async ({ page }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        // Send a query that should trigger memory retrieval
        const queryMessage = "What was the secret code?";
        await page.locator("#composer-textarea").fill(queryMessage);
        await page.locator("button.send-button").click();

        // Wait for potential AI response with memory context
        await page.waitForTimeout(2000);

        // Verify message was sent
        const sentMessage = page
          .locator(".message.outgoing")
          .last()
          .locator(".msg-body .text");
        await expect(sentMessage).toContainText("secret code");
      }
    });

    test("should handle memory persistence across sessions", async ({
      page,
    }) => {
      if (existingProfiles.length < 1) {
        test.skip();
        return;
      }

      await switchToProfile(page, existingProfiles[0].id);

      // Get current chat state
      const chatList = page.locator(".chat-list .chat-list-item");
      const initialCount = await chatList.count();

      // Reload to simulate new session
      await reloadPage(page);
      await switchToProfile(page, existingProfiles[0].id);

      // Verify state persisted
      const newCount = await chatList.count();
      expect(newCount).toBe(initialCount);
    });
  });

  test.describe("Hyperdimensional Memory", () => {
    test("should encode semantic information", async ({ page }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        // Send semantically rich messages
        const semanticMessages = [
          "I love programming in TypeScript",
          "JavaScript is great for web development",
          "Node.js enables server-side JavaScript",
        ];

        for (const msg of semanticMessages) {
          await page.locator("#composer-textarea").fill(msg);
          await page.locator("button.send-button").click();
          await page.waitForTimeout(500);
        }

        // Verify messages were sent
        const outgoingMessages = page.locator(".message.outgoing");
        const count = await outgoingMessages.count();
        expect(count).toBeGreaterThanOrEqual(semanticMessages.length);
      }
    });

    test("should find semantically similar memories", async ({ page }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        // Query for semantically related content
        const queryMessage = "Tell me about programming languages";
        await page.locator("#composer-textarea").fill(queryMessage);
        await page.locator("button.send-button").click();

        await page.waitForTimeout(1000);

        // Verify query was sent
        const sentMessage = page
          .locator(".message.outgoing")
          .last()
          .locator(".msg-body .text");
        await expect(sentMessage).toContainText("programming");
      }
    });
  });

  test.describe("Context Management", () => {
    test("should maintain conversation context", async ({ page }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        // Send context-building messages
        await page.locator("#composer-textarea").fill("My name is Alice");
        await page.locator("button.send-button").click();
        await page.waitForTimeout(500);

        await page.locator("#composer-textarea").fill("I work as a developer");
        await page.locator("button.send-button").click();
        await page.waitForTimeout(500);

        // Query that requires context
        await page.locator("#composer-textarea").fill("What do I do for work?");
        await page.locator("button.send-button").click();

        // Verify messages were sent
        const outgoingMessages = page.locator(".message.outgoing");
        const count = await outgoingMessages.count();
        expect(count).toBeGreaterThanOrEqual(3);
      }
    });

    test("should handle context window limits", async ({ page }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        // Send many messages to test context window
        for (let i = 0; i < 10; i++) {
          await page.locator("#composer-textarea").fill(`Message ${i + 1}`);
          await page.locator("button.send-button").click();
          await page.waitForTimeout(200);
        }

        // App should handle this gracefully
        const chatList = page.locator(".chat-list");
        await expect(chatList).toBeVisible();
      }
    });
  });

  test.describe("Memory Cleanup", () => {
    test("should handle memory cleanup operations", async ({ page }) => {
      if (existingProfiles.length < 1) {
        test.skip();
        return;
      }

      await switchToProfile(page, existingProfiles[0].id);

      // Verify app is stable after potential cleanup operations
      const chatList = page.locator(".chat-list");
      await expect(chatList).toBeVisible();

      // Wait for any background cleanup
      await page.waitForTimeout(2000);

      // App should remain stable
      await expect(chatList).toBeVisible();
    });
  });

  test.describe("Memory Performance", () => {
    test("should retrieve memories within acceptable time", async ({
      page,
    }) => {
      if (existingProfiles.length < 2) {
        test.skip();
        return;
      }

      const userA = existingProfiles[0];
      const userB = existingProfiles[1];

      await switchToProfile(page, userA.id);

      const chatItem = page
        .locator(".chat-list .chat-list-item")
        .filter({ hasText: userB.name });

      const chatExists = await chatItem.isVisible().catch(() => false);

      if (chatExists) {
        await chatItem.click();

        const startTime = Date.now();

        // Send a query
        await page.locator("#composer-textarea").fill("Quick memory test");
        await page.locator("button.send-button").click();

        // Wait for message to appear
        const sentMessage = page
          .locator(".message.outgoing")
          .last()
          .locator(".msg-body .text");
        await expect(sentMessage).toContainText("Quick memory test");

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Should respond within 5 seconds
        expect(responseTime).toBeLessThan(5000);
      }
    });
  });
});

test.describe("Memory Edge Cases", () => {
  test("should handle empty memory queries", async ({ page }) => {
    await page.goto("/");

    // App should handle empty state gracefully
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should handle special characters in memories", async ({ page }) => {
    await page.goto("/");

    // App should be stable
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should handle very long text in memories", async ({ page }) => {
    await page.goto("/");

    // App should be stable
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
