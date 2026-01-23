/* eslint-disable no-console */
import { BrowserContext, expect, Page } from "@playwright/test";

export const chatmailServer = "https://ci-chatmail.testrun.org";

export const userNames = ["Alice", "Bob", "Chris", "Denis", "Eve"];

export const groupName = "TestGroup";

export type User = {
  name: string;
  id: string;
  address: string;
  password?: string;
};

// Use HTTP in CI/test environment, HTTPS otherwise
const BASE_URL =
  process.env.CI || process.env.NODE_ENV === "test"
    ? "http://localhost:3000/"
    : "https://localhost:3000/";

export async function reloadPage(page: Page): Promise<void> {
  await page.goto(BASE_URL);
}

export async function clickThroughTestIds(
  page: Page,
  testIds: string[],
): Promise<void> {
  for await (const testId of testIds) {
    await page.getByTestId(testId).click();
  }
}

export async function switchToProfile(
  page: Page,
  accountId: string,
): Promise<void> {
  await page.getByTestId(`account-item-${accountId}`).hover(); // without click is not received!
  await page.getByTestId(`account-item-${accountId}`).click();
  await expect(page.getByTestId(`selected-account:${accountId}`)).toHaveCount(
    1,
    { timeout: 10000 },
  );
}

export async function createUser(
  userName: string,
  page: Page,
  existingProfiles: User[],
  isFirstOnboarding: boolean,
): Promise<User> {
  const user = await createNewProfile(page, userName, isFirstOnboarding);

  expect(user.id).toBeDefined();

  existingProfiles.push(user);
  console.log(`User ${user.name} wurde angelegt!`, user);
  return user;
}

export const getUser = (index: number, existingProfiles: User[]) => {
  if (!existingProfiles || existingProfiles.length < index + 1) {
    throw new Error(
      `Not enough profiles for test! Found ${existingProfiles?.length}`,
    );
  }
  if (existingProfiles.length < 2) {
    throw new Error(
      `Not enough profiles for chat test! Found ${existingProfiles?.length}`,
    );
  }
  return existingProfiles[index];
};

/**
 * Wait for the app to be ready - either showing accounts or the onboarding dialog
 * This handles the variable initialization time in CI environments
 */
async function waitForAppReady(page: Page): Promise<"accounts" | "onboarding"> {
  console.log("Waiting for app to be ready...");

  // Wait for the main container first
  try {
    await page.waitForSelector(".main-container", { timeout: 30000 });
  } catch {
    console.log("Main container not found, waiting longer...");
    await page.waitForTimeout(5000);
  }

  // Now check for either the onboarding dialog or account buttons
  // Use a loop with retries to handle slow initialization
  for (let attempt = 0; attempt < 10; attempt++) {
    // Check for onboarding dialog using test ID
    const onboardingDialog = page.getByTestId("onboarding-dialog");
    const isOnboardingVisible = await onboardingDialog
      .isVisible()
      .catch(() => false);

    if (isOnboardingVisible) {
      console.log("Onboarding dialog detected");
      return "onboarding";
    }

    // Check for account buttons (existing profiles)
    const accountButtons = page.locator("button[x-account-sidebar-account-id]");
    const accountCount = await accountButtons.count().catch(() => 0);

    if (accountCount > 0) {
      console.log(`Found ${accountCount} existing account(s)`);
      return "accounts";
    }

    // Also check for add-account-button which appears when accounts exist
    const addAccountButton = page.getByTestId("add-account-button");
    const hasAddButton = await addAccountButton.isVisible().catch(() => false);

    if (hasAddButton) {
      console.log("Add account button found - accounts exist");
      return "accounts";
    }

    console.log(`Attempt ${attempt + 1}: App not ready yet, waiting...`);
    await page.waitForTimeout(1000);
  }

  // If we still haven't found anything, assume fresh start with onboarding
  console.log("Assuming fresh start - waiting for onboarding dialog");
  await page.getByTestId("onboarding-dialog").waitFor({ timeout: 30000 });
  return "onboarding";
}

/**
 * create a profile after pasting DCACCOUNT link
 */
export async function createNewProfile(
  page: Page,
  name: string,
  isFirstOnboarding: boolean,
): Promise<User> {
  // Wait for app to be ready
  const appState = await waitForAppReady(page);
  console.log(
    `App state: ${appState}, isFirstOnboarding: ${isFirstOnboarding}`,
  );

  // Determine if we need to click add-account-button
  // This is needed when:
  // 1. It's not the first onboarding (adding additional account)
  // 2. OR accounts already exist even though isFirstOnboarding is true (stale state)
  const needToAddAccount = !isFirstOnboarding || appState === "accounts";

  if (needToAddAccount && appState === "accounts") {
    // Need to click add-account-button to show onboarding screen
    console.log("Clicking add-account-button to show onboarding screen");
    const addAccountButton = page.getByTestId("add-account-button");
    await expect(addAccountButton).toBeVisible({ timeout: 30000 });
    await expect(addAccountButton).toBeEnabled({ timeout: 10000 });
    await addAccountButton.click();

    // Wait for onboarding dialog to appear
    await page.getByTestId("onboarding-dialog").waitFor({ timeout: 15000 });
  }

  // Now we should be on the onboarding screen - click create account
  const createAccountButton = page.getByTestId("create-account-button");
  await expect(createAccountButton).toBeVisible({ timeout: 30000 });
  await expect(createAccountButton).toBeEnabled({ timeout: 10000 });
  await createAccountButton.click();

  await page.evaluate(
    `navigator.clipboard.writeText('dcaccount:${chatmailServer}/new')`,
  );
  await clickThroughTestIds(page, [
    "other-login-button",
    "scan-qr-login",
    "paste",
  ]);

  // Wait for the dialog to close, so that the underlying content
  // becomes interactive, otherwise `fill()` might silently do nothing.
  await expect(page.getByTestId("qrscan-dialog")).not.toBeVisible();

  const nameInput = page.locator("#displayName");

  await expect(nameInput).toBeVisible();

  await nameInput.fill(name);

  await page.getByTestId("login-button").click();

  // Wait for the onboarding dialog to close (account creation complete)
  // This can take a while in CI as the chatmail account is being created
  console.log("Waiting for account creation to complete...");
  await expect(page.getByTestId("onboarding-dialog")).not.toBeVisible({
    timeout: 120000,
  });

  // Wait for account to be created and active
  const accountList = page.locator("button[x-account-sidebar-account-id]");
  await expect(accountList.last()).toHaveClass(/_active(\s|$)/, {
    timeout: 30000,
  });

  // Wait for the main screen to be fully loaded
  // The settings button only appears on Main or AINeighborhood screens
  console.log("Waiting for main screen to load...");

  // open settings to validate the name and to get
  // the (randomly) created mail address
  const settingsButton = page.getByTestId("open-settings-button");
  await expect(settingsButton).toBeVisible({ timeout: 60000 });
  await expect(settingsButton).toBeEnabled({ timeout: 10000 });
  await settingsButton.click();

  await expect(page.locator("[class*='profileDisplayName']")).toHaveText(name);
  await page.getByTestId("open-advanced-settings").click();
  await page.getByTestId("open-account-and-password").click();
  const addressLocator = page.locator("#addr");
  await expect(addressLocator).toHaveValue(/.+@.+/);
  const address = await addressLocator.inputValue();

  await page.getByTestId("cancel").click();
  await page.getByTestId("settings-advanced-close").click();

  const newId = await accountList
    .last()
    .getAttribute("x-account-sidebar-account-id");

  expect(newId).not.toBeNull();

  if (newId && address) {
    return {
      id: newId,
      name,
      address,
    };
  } else {
    throw new Error(`User ${name} could not be created!`);
  }
}

export async function getProfile(
  page: Page,
  accountId: string,
  includePasswd = false,
): Promise<User> {
  await page
    .getByTestId(`account-item-${accountId}`)
    .click({ button: "right" });
  await page.getByTestId("open-settings-menu-item").click();
  const nameLocator = page.locator("[class*='profileDisplayName']");
  await expect(nameLocator).not.toBeEmpty();
  const name = await nameLocator.textContent();
  await page.getByTestId("open-advanced-settings").click();
  await page.getByTestId("open-account-and-password").click();
  const addressLocator = page.locator("#addr");
  await expect(addressLocator).toHaveValue(/.+@.+/);
  const address = await addressLocator.inputValue();
  let password = "";
  if (includePasswd) {
    const passwdLocator = page.locator("#password");
    password = await passwdLocator.inputValue();
  }
  await page.getByTestId("cancel").click();
  await page.getByTestId("settings-advanced-close").click();

  return {
    id: accountId,
    name: name ?? "",
    address: address ?? "",
    password: password,
  };
}

export async function createProfiles(
  number: number,
  existingProfiles: User[],
  page: Page,
  context: BrowserContext,
  browserName: string,
): Promise<void> {
  const hasProfileWithName = (name: string): boolean => {
    let hasProfile = false;
    if (existingProfiles.length > 0) {
      existingProfiles.forEach((user) => {
        if (user.name === name) {
          hasProfile = true;
        }
      });
    }
    return hasProfile;
  };
  if (browserName.toLowerCase().indexOf("chrom") > -1) {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  for (let n = 0; n < number; n++) {
    if (!hasProfileWithName(userNames[n])) {
      await createUser(userNames[n], page, existingProfiles, n === 0);
    } else {
      console.log("User already exists");
    }
  }
}

export async function deleteAllProfiles(
  page: Page,
  existingProfiles: User[],
): Promise<void> {
  if (existingProfiles.length < 1) {
    throw new Error("Not existing profiles to delete!");
  }
  for (let i = 0; i < existingProfiles.length; i++) {
    const profileToDelete = existingProfiles[i];
    const deleted = await deleteProfile(page, profileToDelete.id);
    expect(deleted).toContain(profileToDelete.name);
    if (deleted) {
      /* ignore-console-log */
      console.log(`User ${profileToDelete.name} was deleted!`);
    }
  }
}

/**
 * Load existing profiles from the app.
 * This function handles the case where no profiles exist yet (fresh app start).
 *
 * FIXED: Uses test IDs and proper attribute selectors instead of CSS class names
 * for more reliable element detection.
 */
export async function loadExistingProfiles(page: Page): Promise<User[]> {
  const existingProfiles: User[] = [];

  // Wait for app to be ready
  const appState = await waitForAppReady(page);

  if (appState === "onboarding") {
    console.log("Fresh app start - no existing profiles");
    return [];
  }

  // Find account buttons using the custom attribute
  const accountList = page.locator("button[x-account-sidebar-account-id]");
  const existingAccountItems = await accountList.count();
  console.log("existingAccountItems", existingAccountItems);

  if (existingAccountItems > 0) {
    // Wait for accounts to finish loading (aria-busy=false)
    try {
      await page.waitForSelector(
        "button[x-account-sidebar-account-id][aria-busy=false]",
        { timeout: 10000 },
      );
    } catch {
      console.log("Account buttons still busy, proceeding anyway...");
    }

    for (let i = 0; i < existingAccountItems; i++) {
      const account = accountList.nth(i);
      const id = await account.getAttribute("x-account-sidebar-account-id");
      console.log(`Found account ${id}`);
      if (id) {
        try {
          const p = await getProfile(page, id);
          existingProfiles.push(p);
        } catch (error) {
          console.log(`Failed to get profile for account ${id}:`, error);
        }
      }
    }
  }

  return existingProfiles;
}

export async function deleteProfile(
  page: Page,
  accountId?: string, // if empty, the last account will be deleted
): Promise<string | null> {
  const accountList = page.locator("button[x-account-sidebar-account-id]");
  await expect(accountList.first()).toBeVisible({ timeout: 10000 });
  const accounts = await accountList.all();
  if (accounts.length > 0) {
    if (accountId) {
      await page
        .getByTestId(`account-item-${accountId}`)
        .click({ button: "right" });
    } else {
      await accountList.last().click({ button: "right" });
    }
    // await page.screenshot({ path: 'accountList.png' })
    await page.getByTestId("delete-account-menu-item").click();
    await expect(page.getByTestId("account-deletion-dialog")).toBeVisible();
    const userName: string | null = await page
      .locator("[class*='accountName'] > div")
      .nth(0)
      .textContent();
    const deleteButton = page.getByTestId("delete-account");
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(page.locator("[class*='infoBox']")).toBeVisible();
    if (accountId) {
      await expect(page.getByTestId(`account-item-${accountId}`)).toHaveCount(
        0,
      );
    }
    return userName;
  }
  return null;
}
