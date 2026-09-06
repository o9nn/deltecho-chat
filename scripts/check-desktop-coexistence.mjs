import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  readFileSync(resolve(root, relativePath), "utf8");

const files = {
  shared: read("packages/shared/constants.ts"),
  electronConfig: read("packages/target-electron/src/application-config.ts"),
  electronConstants: read(
    "packages/target-electron/src/application-constants.ts",
  ),
  electronMain: read("packages/target-electron/src/index.ts"),
  electronProtocols: read("packages/target-electron/src/open_url.ts"),
  electronCore: read("packages/target-electron/src/deltachat/stdio_server.ts"),
  electronTray: read("packages/target-electron/src/tray.ts"),
  electronBuilder: read(
    "packages/target-electron/build/gen-electron-builder-config.js",
  ),
  onboarding: read(
    "packages/frontend/src/components/screens/WelcomeScreen/OnboardingScreen.tsx",
  ),
  tauriConfig: read("packages/target-tauri/src-tauri/tauri.conf.json5"),
  tauriCargo: read("packages/target-tauri/src-tauri/Cargo.toml"),
  tauriMain: read("packages/target-tauri/src-tauri/src/main.rs"),
  tauriRuntime: read("packages/target-tauri/src-tauri/src/lib.rs"),
  tauriCore: read("packages/target-tauri/src-tauri/src/state/deltachat.rs"),
  tauriNotifications: read(
    "packages/target-tauri/src-tauri/src/state/notification.rs",
  ),
  tauriDeepLinks: read("packages/target-tauri/src-tauri/src/deeplink.rs"),
  tauriInstaller: read("packages/target-tauri/src-tauri/windows/hooks.nsi"),
};

const checks = [];
const requireMatch = (name, content, pattern) => {
  const pass = pattern.test(content);
  checks.push({ name, pass });
  return pass;
};
const forbidMatch = (name, content, pattern) => {
  const pass = !pattern.test(content);
  checks.push({ name, pass });
  return pass;
};

requireMatch(
  "Shared window title is DeltEcho Chat",
  files.shared,
  /appName\s*=\s*["']DeltEcho Chat["']/,
);
requireMatch(
  "Electron config store uses DeltEcho namespace",
  files.electronConfig,
  /applicationConfig\(["']DeltEcho["']\)/,
);
requireMatch(
  "Electron portable data stays under DeltEchoData",
  files.electronConfig,
  /["']DeltEchoData["']/,
);
requireMatch(
  "Electron Chromium profile has an explicit DeltEcho path",
  files.electronMain,
  /setPath\(["']userData["'],\s*deltechoUserDataPath\)/,
);
requireMatch(
  "Electron disposable profile keeps Chromium under DC_TEST_DIR",
  files.electronMain,
  /process\.env\.DC_TEST_DIR[\s\S]*?["']ChromiumProfile["']/,
);
forbidMatch(
  "Electron single-instance lock is never bypassed by DC_TEST_DIR",
  files.electronMain,
  /requestSingleInstanceLock\(\)[\s\S]{0,120}!process\.env\.DC_TEST_DIR/,
);
requireMatch(
  "Electron Windows AppUserModelID is DeltEcho-owned",
  files.electronMain,
  /setAppUserModelId\(DELTECHO_APP_ID\)/,
);
requireMatch(
  "Electron process title is DeltEchoChat",
  files.electronMain,
  /process\.title\s*=\s*["']DeltEchoChat["']/,
);
requireMatch(
  "Electron embedded core receives the isolated accounts path",
  files.electronCore,
  /DC_ACCOUNTS_PATH:\s*this\.accounts_path/,
);
requireMatch(
  "Electron package ID is DeltEcho-owned",
  files.electronBuilder,
  /appId["']?\]\s*=\s*["']chat\.deltecho\.desktop\.electron["']/,
);
requireMatch(
  "Electron executable is DeltEchoChat",
  files.electronBuilder,
  /executableName:\s*["']DeltEchoChat["']/,
);
requireMatch(
  "Electron installer exposes DeltEcho account and login schemes",
  files.electronBuilder,
  /schemes:\s*\[[^\]]*["']deltecho-account["'][^\]]*["']deltecho-login["']/s,
);
requireMatch(
  "Electron runtime registers only DeltEcho account and login schemes",
  files.electronProtocols,
  /setAsDefaultProtocolClient\(["']deltecho-account["']\)[\s\S]*setAsDefaultProtocolClient\(["']deltecho-login["']\)/,
);
requireMatch(
  "Electron translates DeltEcho account links for the Delta Chat core",
  files.electronProtocols,
  /deltecho-account:[\s\S]*dcaccount:/,
);
requireMatch(
  "Electron translates DeltEcho login links for the Delta Chat core",
  files.electronProtocols,
  /deltecho-login:[\s\S]*dclogin:/,
);
requireMatch(
  "Electron tray identifies DeltEcho Chat",
  files.electronTray,
  /DeltEcho Chat/,
);
requireMatch(
  "Desktop onboarding uses the shared DeltEcho product identity",
  files.onboarding,
  /`Welcome to \$\{appName\}`/,
);
forbidMatch(
  "Desktop onboarding does not present the fork as standard Delta Chat",
  files.onboarding,
  /tx\(["']welcome_desktop["']\)/,
);
forbidMatch(
  "Electron does not claim standard Delta Chat protocols",
  files.electronProtocols,
  /setAsDefaultProtocolClient\(["'](?:openpgp4fpr|dcaccount|dclogin)["']\)/i,
);
forbidMatch(
  "Electron installer does not claim .xdc files",
  files.electronBuilder,
  /fileAssociations["']?\]\s*=\s*\[\s*\{/,
);
requireMatch(
  "Tauri bundle ID is DeltEcho-owned",
  files.tauriConfig,
  /(?:["']identifier["']|identifier):\s*["']chat\.deltecho\.desktop\.tauri["']/,
);
requireMatch(
  "Tauri product name is DeltEcho Chat",
  files.tauriConfig,
  /(?:["']productName["']|productName):\s*["']DeltEcho Chat["']/,
);
requireMatch(
  "Tauri Rust package is DeltEcho-owned",
  files.tauriCargo,
  /name\s*=\s*["']deltecho-chat["']/,
);
requireMatch(
  "Tauri executable uses the DeltEcho library crate",
  files.tauriMain,
  /deltecho_chat_lib::run\(\)/,
);
requireMatch(
  "Tauri window title identifies DeltEcho Chat",
  files.tauriRuntime,
  /\.title\(["']DeltEcho Chat["']\)/,
);
requireMatch(
  "Tauri embedded core stores accounts below bundle-scoped app data",
  files.tauriCore,
  /app_data_dir\(\)[\s\S]*join\(["']accounts["']\)/,
);
requireMatch(
  "Tauri notification scheme is DeltEcho-owned",
  files.tauriNotifications,
  /["']deltecho-notification["']/,
);
requireMatch(
  "Tauri runtime registers DeltEcho account and login schemes",
  files.tauriDeepLinks,
  /register_as_default_handler\(["']deltecho-account["']\)[\s\S]*register_as_default_handler\(["']deltecho-login["']\)/,
);
requireMatch(
  "Tauri installer registers only DeltEcho protocols",
  files.tauriInstaller,
  /URI_SCHEME ["']deltecho-account["'][\s\S]*URI_SCHEME ["']deltecho-login["'][\s\S]*URI_SCHEME ["']deltecho-notification["']/,
);
forbidMatch(
  "Tauri installer does not claim standard Delta Chat protocols",
  files.tauriInstaller,
  /URI_SCHEME ["'](?:openpgp4fpr|dcaccount|dclogin|dcnotification)["']/i,
);
forbidMatch(
  "Tauri installer does not claim .xdc files",
  files.tauriInstaller,
  /APP_ASSOCIATE\s+["']xdc["']/i,
);

for (const check of checks) {
  process.stdout.write(`${check.pass ? "PASS" : "FAIL"}  ${check.name}\n`);
}

const failures = checks.filter(({ pass }) => !pass);
process.stdout.write(
  `\nDesktop coexistence: ${checks.length - failures.length}/${
    checks.length
  } checks passed.\n`,
);
if (failures.length > 0) {
  process.exitCode = 1;
}
