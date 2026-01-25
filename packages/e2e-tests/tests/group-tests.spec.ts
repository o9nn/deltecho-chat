import { test, expect } from "@playwright/test";

import {
  groupName,
  getUser,
  createProfiles,
  switchToProfile,
  User,
  loadExistingProfiles,
  deleteAllProfiles,
  reloadPage,
  clickThroughTestIds,
} from "../playwright-helper";

test.describe.configure({ mode: "serial" });

let existingProfiles: User[] = [];

const numberOfProfiles = 3;

test.beforeAll(async ({ browser }) => {
  // Use try-finally to ensure context is properly cleaned up
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await reloadPage(page);

    existingProfiles = (await loadExistingProfiles(page)) ?? existingProfiles;
    await createProfiles(
      numberOfProfiles,
      existingProfiles,
      page,
      context,
      browser.browserType().name(),
    );
  } finally {
    await context.close();
  }
});

test.beforeEach(async ({ page }) => {
  await reloadPage(page);
});

test.afterAll(async ({ browser }) => {
  // Use try-finally to ensure context is properly cleaned up
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await reloadPage(page);
    await deleteAllProfiles(page, existingProfiles);
  } finally {
    await context.close();
  }
});

test("start chat with user", async ({ page, context, browserName }) => {
  if (browserName.toLowerCase().indexOf("chrom") > -1) {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  const userA = getUser(0, existingProfiles);
  const userB = getUser(1, existingProfiles);
  await switchToProfile(page, userA.id);
  // copy invite link from user A
  await clickThroughTestIds(page, [
    "qr-scan-button",
    "copy-qr-code",
    "confirm-qr-code",
  ]);

  await switchToProfile(page, userB.id);
  // paste invite link in account of userB
  await clickThroughTestIds(page, ["qr-scan-button", "show-qr-scan", "paste"]);
  const confirmDialog = page.getByTestId("confirm-start-chat");
  await expect(confirmDialog).toContainText(userA.name);

  await page.getByTestId("confirm-start-chat").getByTestId("confirm").click();
  // Wait for the chat to appear in the chat list (may take time for sync)
  const chatItem = page
    .locator(".chat-list .chat-list-item")
    .filter({ hasText: userA.name })
    .first();
  await expect(chatItem).toBeVisible({ timeout: 30000 });
  /* ignore-console-log */
  console.log(`Chat with ${userA.name} created!`);
  await chatItem.click();

  const messageText = `Hello ${userA.name}!`;
  await page.locator("#composer-textarea").fill(messageText);
  await page.locator("button.send-button").click();
  const sentMessageText = page
    .locator(`.message.outgoing`)
    .last()
    .locator(".msg-body .text");
  await expect(sentMessageText).toHaveText(messageText);
});

test("create group", async ({ page, context, browserName }) => {
  // Increase test timeout to accommodate group creation delays
  test.setTimeout(120_000);
  if (browserName.toLowerCase().indexOf("chrom") > -1) {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  const userA = existingProfiles[0];
  const userB = existingProfiles[1];
  const userC = existingProfiles[2];
  await switchToProfile(page, userA.id);
  const chatUserB = page
    .locator(".chat-list .chat-list-item")
    .filter({ hasText: userB.name })
    .first();
  await expect(chatUserB).toBeVisible();
  await page.locator("#new-chat-button").click();
  await page.locator("#newgroup button").click();
  await page.locator(".group-name-input").fill(groupName);
  await page.locator("#addmember button").click();
  const addMemberDialog = page.getByTestId("add-member-dialog");
  /* ignore-console-log */
  console.log("userB", userB);
  // Use first() to avoid strict mode violation when multiple contacts match
  await page
    .locator(".contact-list-item")
    .filter({ hasText: userB.name })
    .first()
    .click();

  await addMemberDialog.getByTestId("ok").click();

  await page.getByTestId("group-create-button").click();
  const chatListItem = page
    .locator(".chat-list .chat-list-item")
    .filter({ hasText: groupName });
  await expect(chatListItem).toBeVisible();
  await page.locator("#composer-textarea").fill(`Hello group members!`);
  await page.locator("button.send-button").click();
  const badgeNumber = page
    .getByTestId(`account-item-${userB.id}`)
    .locator("[class*='accountBadgeIcon']");
  // Badge notification may take time to appear in CI
  await expect(badgeNumber).toHaveText("1", { timeout: 30000 });
  // copy group invite link
  await page.getByTestId("chat-info-button").click();
  await page.locator("#showqrcode button").click();
  await clickThroughTestIds(page, [
    "copy-qr-code",
    "confirm-qr-code",
    "view-group-dialog-header-close",
  ]);

  // paste invite link in account of userC
  await switchToProfile(page, userC.id);
  await clickThroughTestIds(page, ["qr-scan-button", "show-qr-scan", "paste"]);

  const confirmDialog = page.getByTestId("confirm-join-group");
  await expect(confirmDialog).toBeVisible();
  // confirm dialog should contain group name
  await expect(confirmDialog).toContainText(groupName);
  await page.getByTestId("confirm-join-group").getByTestId("confirm").click();
  // userA invited you to group message
  await expect(page.locator("#message-list li").nth(1)).toContainText(
    userA.address,
  );
  // verified chat after response from userA
  await expect(page.locator(".verified-icon-info-msg")).toBeVisible();
  // userB has 2 new notifications now
  const badge = page
    .getByTestId(`account-item-${userB.id}`)
    .locator("[class*='accountBadgeIcon']")
    .getByText("2");

  // Badge notification may take time to update in CI
  await expect(badge).toBeVisible({ timeout: 30000 });
});
