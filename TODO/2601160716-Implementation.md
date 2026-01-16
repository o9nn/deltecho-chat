# Implementation Plan - System Stabilization

## Goal Description

Resolve persistent console errors (`net::ERR_CONNECTION_REFUSED`, `404 Not Found`, `Method not implemented`), ensure consistent type definitions for configuration, and verify the autonomous functionality of the Deep Tree Echo bot.

## User Review Required
>
> [!IMPORTANT]
> **AtomSpace Integration**: I will temporarily disable the AtomSpace endpoint in the frontend configuration to stop connection errors, as the service appears to be offline. We can re-enable it once the specific AtomSpace service is running.

## Proposed Changes

### Shared Types & State

#### [MODIFY] [shared-types.d.ts](file:///c:/Users/sandbox_713/Documents/gh/deltecho-chat/deltecho-chat/packages/shared/shared-types.d.ts)

- Add missing keys to `DesktopSettingsType`:
  - `deepTreeEchoBotUseParallelProcessing?: boolean;`
  - `deepTreeEchoBotProactiveEnabled?: boolean;`

### Browser Runtime

#### [MODIFY] [runtime.ts](file:///c:/Users/sandbox_713/Documents/gh/deltecho-chat/deltecho-chat/packages/target-browser/runtime-browser/runtime.ts)

- Ensure `notifyWebxdcMessageChanged` logs debug instead of error.
- Ensure `getWebxdcIconURL` returns empty string instead of throwing.

### Static Resources (Live2D & Locales)

#### [MODIFY] [server.js / index.ts](file:///c:/Users/sandbox_713/Documents/gh/deltecho-chat/deltecho-chat/packages/target-browser/src/index.ts)

- Verify static file serving configuration for `live2dcubismcore.min.js` and `locales`.
- Ensure files exist in the `dist` or served static directories.

### AtomSpace Integration

#### [MODIFY] [AINeighborhoodDashboard.tsx](file:///c:/Users/sandbox_713/Documents/gh/deltecho-chat/deltecho-chat/packages/frontend/src/components/screens/AINeighborhoodDashboard/AINeighborhoodDashboard.tsx)

- (Completed) Commented out `atomSpaceEndpoint` to prevent connection errors.

## Verification Plan

### Automated Tests

- Run `pnpm check:types` to verify `shared-types.d.ts` changes.
- Run `pnpm build:browser` to ensure successful compilation.

### Manual Verification

1. **Start Server**: Run `node dist/server.js`.
2. **Load App**: Open `http://localhost:3000`.
3. **Check Console**: Verify no red errors appear on load.
    - No `ERR_CONNECTION_REFUSED`.
    - No `404` for config.
    - No `Method not implemented`.
4. **Test Bot Settings**: Toggle Deep Tree Echo Bot settings in UI and verify network request succeeds (200 OK).
