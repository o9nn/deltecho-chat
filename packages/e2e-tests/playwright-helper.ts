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
 * create a profile after pasting DCACCOUNT link
 */
export async function createNewProfile(
  page: Page,
  name: string,
  isFirstOnboarding: boolean,
): Promise<User> {
  // Wait for either account button or welcome screen
  await Promise.race([
    page.waitForSelector(".styles_module_account", { timeout: 15000 }),
    page.waitForSelector(".styles_module_welcome", { timeout: 15000 }),
  ]);

  const accountList = page.locator(".styles_module_account");

  if (!isFirstOnboarding) {
    // add account to show onboarding screen
    await page.getByTestId("add-account-button").click();
  }
  // create a new account
  await page.getByTestId("create-account-button").click();

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

  const newAccountList = page.locator(".styles_module_account");
  await expect(newAccountList.last()).toHaveClass(
    /(^|\s)styles_module_active(\s|$)/,
  );
  // open settings to validate the name and to get
  // the (randomly) created mail address
  const settingsButton = page.getByTestId("open-settings-button");
  await settingsButton.click();

  await expect(page.locator(".styles_module_profileDisplayName")).toHaveText(
    name,
  );
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
  const nameLocator = page.locator(".styles_module_profileDisplayName");
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
 * FIXED: Added proper timeout handling and graceful fallback for fresh app starts
 * where no profiles exist and the welcome screen is shown instead.
 */
export async function loadExistingProfiles(page: Page): Promise<User[]> {
  const existingProfiles: User[] = [];

  // Wait for main container with a reasonable timeout
  try {
    await page.waitForSelector(".main-container", { timeout: 10000 });
  } catch {
    console.log(
      "Main container not found within timeout, returning empty profiles",
    );
    return [];
  }

  // Check if we're on the welcome/onboarding screen (no profiles yet)
  // This is the expected state on fresh app start
  const welcomeDialog = await page
    .locator(".styles_module_welcome")
    .isVisible();
  if (welcomeDialog) {
    console.log(
      "Welcome dialog visible - no existing profiles (fresh app start)",
    );
    return [];
  }

  // Try to find account buttons with a shorter timeout
  // On fresh start, these won't exist, so we need to handle that gracefully
  try {
    await page.waitForSelector("button.styles_module_account", {
      timeout: 5000,
    });
  } catch {
    console.log(
      "No account buttons found within timeout - no existing profiles",
    );
    return [];
  }

  // Wait for accounts to finish loading (aria-busy=false)
  try {
    await page.waitForSelector(
      "button.styles_module_account[aria-busy=false]",
      { timeout: 5000 },
    );
  } catch {
    console.log(
      "Account buttons still busy or not found - returning empty profiles",
    );
    return [];
  }

  const accountList = page.locator("button.styles_module_account");
  const existingAccountItems = await accountList.count();
  console.log("existingAccountItems", existingAccountItems);

  if (existingAccountItems > 0) {
    // Double-check: if there's only one account and welcome dialog is visible,
    // it's a new empty account that hasn't been persisted yet
    if (existingAccountItems === 1) {
      const welcomeStillVisible = await page
        .locator(".styles_module_welcome")
        .isVisible();
      if (welcomeStillVisible) {
        console.log("Single account with welcome dialog - not yet persisted");
        return [];
      }
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
  await page.waitForSelector(".styles_module_account");
  const accountList = page.locator(".styles_module_account");
  await expect(accountList.last()).toBeVisible();
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
      .locator(".styles_module_accountName > div")
      .nth(0)
      .textContent();
    const deleteButton = page.getByTestId("delete-account");
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();
    await expect(page.locator(".styles_module_infoBox")).toBeVisible();
    if (accountId) {
      await expect(page.getByTestId(`account-item-${accountId}`)).toHaveCount(
        0,
      );
    }
    return userName;
  }
  return null;
}
