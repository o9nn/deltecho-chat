# Windows Desktop Coexistence

DeltEcho Chat embeds the Delta Chat core as its messaging substrate, but it is an independent desktop application. A standard Delta Chat installation and DeltEcho Chat must be able to run on the same Windows user account without sharing profiles, accounts, single-instance locks, notification identities, installers, or protocol registrations.

## Supported desktop target

**Electron is the default production target.** Tauri remains a work-in-progress target, but it follows the same identity and storage contract so either build can coexist with standard Delta Chat.

| Boundary                   | Electron                                           | Tauri                                   |
| -------------------------- | -------------------------------------------------- | --------------------------------------- |
| Product                    | `DeltEcho Chat`                                    | `DeltEcho Chat`                         |
| Windows application ID     | `chat.deltecho.desktop.electron`                   | `chat.deltecho.desktop.tauri`           |
| Executable                 | `DeltEchoChat.exe`                                 | `deltecho-chat.exe`                     |
| Configuration/profile root | `%APPDATA%\DeltEcho` and `%APPDATA%\DeltEcho Chat` | `%APPDATA%\chat.deltecho.desktop.tauri` |
| Account database root      | `<DeltEcho config>\accounts`                       | `<DeltEcho app data>\accounts`          |
| Private account link       | `deltecho-account:`                                | `deltecho-account:`                     |
| Private login link         | `deltecho-login:`                                  | `deltecho-login:`                       |
| Notification activation    | Electron application ID                            | `deltecho-notification:`                |

## Embedded Delta Chat core

The messaging engine remains the upstream `@deltachat/stdio-rpc-server`/Delta Chat core. This is intentional: **the core runs inside the DeltEcho desktop process boundary and uses only DeltEcho-owned account storage**.

Electron launches the core over stdio and passes `DC_ACCOUNTS_PATH` from DeltEcho's configuration root. Tauri constructs its account manager at `<app_data_dir>/accounts`, where `app_data_dir` is derived from the DeltEcho bundle identifier. Neither target discovers or opens the standard Delta Chat profile implicitly.

## Protocol and file-association policy

DeltEcho installers claim only DeltEcho-owned URI schemes. They do **not** claim the standard Delta Chat schemes `openpgp4fpr:`, `dcaccount:`, or `dclogin:`, and they do not take ownership of `.xdc` files. This prevents an installation or uninstall from replacing or deleting the upstream client's Windows registry handlers.

DeltEcho can still process a standard Delta Chat link when the user explicitly opens or pastes it inside DeltEcho. Private `deltecho-account:` and `deltecho-login:` links are normalized to the core's `dcaccount:` and `dclogin:` formats after they enter the DeltEcho process.

## Verification

Use **Node.js 20–22 LTS** and the repository-pinned pnpm version. Newer Node releases are rejected because the desktop dependency graph and test tooling are validated only on this LTS range.

Run the permanent identity and storage regression gate:

```powershell
pnpm check:desktop-coexistence
```

Build and package the production Electron target on Windows:

```powershell
pnpm install --frozen-lockfile
pnpm --filter=@deltachat-desktop/target-electron build
pnpm --filter=@deltachat-desktop/target-electron pack:generate_config
pnpm --filter=@deltachat-desktop/target-electron pack:patch-node-modules
Set-Location packages/target-electron
npx electron-builder --config ./electron-builder.json5 --win nsis portable --publish never
```

The generated `electron-builder.json5` must contain the DeltEcho application ID, `DeltEchoChat` executable, DeltEcho product name, no `.xdc` association, and only the two DeltEcho account/login schemes. Run `pack:patch-node-modules` only as the last step before Electron Builder: it prepares a flat packaging tree and intentionally mutates pnpm-linked `node_modules`; run `pnpm install --frozen-lockfile --force` before any later source rebuild.

For a safe runtime smoke test, set `DC_TEST_DIR` to a disposable DeltEcho-only directory. The override moves both the config/account root and Electron Chromium profile beneath that directory while retaining the profile-scoped single-instance lock. It must never point at a standard Delta Chat profile. The reusable `scripts/smoke-windows-desktop.ps1` check verifies the packaged process tree, embedded core, account/profile isolation, lock behavior, and non-interference with standard Delta Chat state.

## Migration behavior

This separation deliberately does not migrate or copy standard Delta Chat data. Users who want the same account in both applications must add or import it explicitly. Existing DeltEcho Electron data under `%APPDATA%\DeltEcho` remains the canonical DeltEcho account location; the explicit Electron Chromium `userData` directory isolates browser caches, cookies, GPU state, and the single-instance lock.
