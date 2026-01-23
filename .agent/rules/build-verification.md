---
trigger: always_on
---

# Build Verification & Preview Deployment

**Purpose**: Ensure Deep Tree Echo functionality works end-to-end before marking phases complete.

---

## 🔴 CRITICAL: Build Verification Checklist

Before any phase can be considered complete, the following must pass:

### Level 1: Compilation

- [ ] `pnpm install` - No errors
- [ ] `pnpm check:types` - TypeScript compiles
- [ ] `pnpm check:lint` - No lint errors

### Level 2: Unit Tests

- [ ] `pnpm test` - All tests pass
- [ ] New code has test coverage

### Level 3: Application Runs

- [ ] `pnpm dev:electron` - App starts without crash
- [ ] `pnpm build:browser` - Browser build succeeds

### Level 4: Feature Validation

- [ ] Deep Tree Echo Bot loads
- [ ] AI Neighborhood dashboard opens (Ctrl+Shift+A)
- [ ] Chat functionality works
- [ ] New features are accessible and functional

---

## 📋 Phase Verification Status

### Phase 1 & 2: Context Registration + UI Bridge

| Check               | Status                 | Notes                                     |
| ------------------- | ---------------------- | ----------------------------------------- |
| TypeScript Compiles | ⚠️ Pre-existing errors | 4 unrelated type warnings                 |
| New Code Compiles   | ✅                     | DialogAdapter, DialogContext registration |
| Keyboard Actions    | ⚠️ Needs Live Test     | UI Bridge methods added                   |

### Phase 4: Contact & Chat History

| Check               | Status | Notes                                          |
| ------------------- | ------ | ---------------------------------------------- |
| TypeScript Compiles | ✅     | New methods pass type check                    |
| API Calls Correct   | ✅     | Using getContactIds, getContactsByIds patterns |
| Needs Live Test     | ⚠️     | Requires running app                           |

---

## 🏗️ Build Commands

```powershell
# 1. Install dependencies
pnpm install

# 2. Type check (expect some pre-existing warnings)
pnpm check:types

# 3. Build browser version (for preview)
pnpm build:browser

# 4. Start development server
pnpm dev:electron

# 5. Run all tests
pnpm test
```

---

## 🎯 Feature Verification Tests

### Deep Tree Echo Core

```
1. Open app
2. Press Ctrl+Shift+A → AI Neighborhood should open
3. Locate Deep Tree Echo in the dashboard
4. Verify status shows "Active"
```

### Chat Management (Phase 4)

```
1. Open a chat conversation
2. Send a test message
3. Verify Deep Tree Echo can respond
4. Check chat history is accessible via Dev Tools:
   > chatManager.getChatHistory(accountId, chatId, 10)
```

### Contact Management

```
1. Open Developer Console (F12)
2. Access chat manager:
   > const { chatManager } = window.DeepTreeEcho
   > chatManager.listContacts(accountId)
3. Verify contacts list returns valid data
```

### Keyboard Navigation

```
1. Press Ctrl+F → Search should focus
2. Press Alt+Down → Next chat selected
3. Press Ctrl+N → New chat dialog opens
4. Press Ctrl+, → Settings opens
```

### Avatar System

```
1. Navigate to AI Neighborhood
2. Locate avatar rendering component
3. Verify Live2D/expression system loads
4. Check expression changes on interaction
```

---

## 🚀 Preview Deployment Options

### Option 1: Local Preview

```bash
pnpm dev:electron
# Opens Electron app for testing
```

### Option 2: Browser Preview

```bash
pnpm build:browser
pnpm start:webserver
# Opens at http://localhost:3000
```

### Option 3: GitHub Actions Preview

- Push to `preview` branch
- GitHub Actions builds and deploys
- Artifacts available for download

---

## 📊 Current Build Status

| Component              | Build Status             | Last Verified |
| ---------------------- | ------------------------ | ------------- |
| Frontend TypeScript    | ⚠️ Pre-existing warnings | 2026-01-14    |
| DialogAdapter          | ✅ Compiles              | 2026-01-14    |
| ChatManager Extensions | ✅ Compiles              | 2026-01-14    |
| UIBridge Extensions    | ✅ Compiles              | 2026-01-14    |
| E2E Tests              | ⬜ Not Run               | -             |
| Electron App           | ⬜ Not Verified          | -             |

---

## 🔧 Known Issues to Fix First

### Pre-existing TypeScript Errors

Located in `DeepTreeEchoChatManager.ts` lines 189, 257:

- Type comparison issue: `chatType` comparing string to number
- These are pre-existing and don't affect new functionality

### Missing Dependencies (May occur)

- TensorFlow.js may need to be lazy-loaded
- Vision capabilities might cause startup slowdown

---

## ✅ Next Action: Attempt Full Build

1. Run `pnpm install` to ensure deps are current
2. Run `pnpm dev:electron` to start the app
3. Verify Deep Tree Echo loads
4. Test new Phase 4 functionality via console
5. Document any issues found

---

_Last Updated: 2026-01-15_
