# CLAUDE.md - Delta Chat Desktop

This file provides guidance for Claude Code when working with the Delta Chat Desktop codebase.

## Project Overview

Delta Chat Desktop is a cross-platform messaging application built on the Delta Chat protocol. It supports three target platforms:

- **Electron** (default, production) - `packages/target-electron`
- **Tauri** (WIP, modern alternative) - `packages/target-tauri`
- **Browser** (experimental) - `packages/target-browser`

## Tech Stack

- **Frontend**: TypeScript, React, SCSS
- **Package Manager**: pnpm (monorepo with workspaces)
- **Node Version**: 20.x (see `.nvmrc`)
- **Backend (Tauri)**: Rust
- **Core**: deltachat-core library (handles encryption, networking, database)
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier (StandardJS-inspired)

## Essential Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # Start Electron in dev mode
pnpm dev:electron          # Same as above
pnpm dev:tauri             # Start Tauri in dev mode
pnpm start:browser         # Start browser version

# Building
pnpm build:electron        # Build Electron app
pnpm build:browser         # Build browser version

# Code Quality
pnpm check                 # Run all checks (types, lint, format, log conventions)
pnpm check:types           # TypeScript type checking
pnpm check:lint            # ESLint
pnpm check:format          # Prettier format check

# Fixing Issues
pnpm fix                   # Fix all auto-fixable issues
pnpm fix:lint              # Fix ESLint issues
pnpm fix:format            # Fix formatting

# Testing
pnpm test                  # Run unit tests
pnpm e2e                   # Run end-to-end tests (builds browser first)

# Watch Mode (for development)
pnpm watch:electron        # Terminal 1: Watch and rebuild
pnpm start:electron        # Terminal 2: Run the app
```

Note: Use `-w` flag to run commands from workspace root regardless of current directory.

## Project Structure

```
packages/
├── frontend/              # Shared React UI components
│   ├── src/              # TypeScript/React source
│   ├── scss/             # Global stylesheets
│   └── themes/           # Theme definitions
├── shared/               # Shared types and utilities
├── runtime/              # Runtime abstraction layer
├── target-electron/      # Electron-specific code
├── target-tauri/         # Tauri-specific code (Rust + TS)
│   ├── src-tauri/       # Rust backend
│   └── crates/          # Rust workspace crates
├── target-browser/       # Browser-specific code
└── e2e-tests/           # Playwright E2E tests

_locales/                 # Translation files (managed via Transifex)
docs/                     # Developer documentation
bin/                      # Build and utility scripts
static/                   # Fonts, help files, extensions
```

## Code Conventions

### General
- Avoid `console.log()` - use the proper logging system
- Use TypeScript strict mode patterns
- Follow existing code style in each file
- Keep PRs focused on single concerns
- Add CHANGELOG.md entries for user-visible changes

### React/TypeScript
- Functional components with hooks preferred
- Use `useTranslationFunction()` hook for i18n in components
- Use `window.static_translate` in non-component code
- Avoid premature optimization and over-abstraction

### CSS/SCSS
- See `docs/STYLES.md` for styling guidelines
- Use existing theme variables when possible

### Translations
- English strings live in Android repo, PR changes there
- Experimental strings: add to `_locales/_untranslated_en.json`
- Run `pnpm translations:update` to pull latest translations

## Git Workflow

- Branch naming: `<username>/<feature>` or fork the repo
- Rebase on main, don't merge main into feature branches
- Squash merge is default for PRs
- PRs need approval before merging
- Add "skip changelog check" in PR description if no user-visible changes

## Key Files

- `packages/runtime/runtime.ts` - Runtime abstraction interface
- `packages/frontend/src/App.tsx` - Main application component
- `packages/shared/shared-types.d.ts` - Shared TypeScript types
- `packages/target-*/runtime-*` - Platform-specific runtime implementations

## Custom Components

This fork includes additional AI/bot components:
- `packages/frontend/src/components/DeepTreeEchoBot/` - AI chatbot integration
- `packages/frontend/src/components/AICompanionHub/` - AI platform connectors

## Testing

- Unit tests: `pnpm test`
- E2E tests: `pnpm e2e` (uses Playwright)
- E2E docs: `docs/E2E-TESTING.md`

## Debugging

- Use Dev Tools in Electron (View > Developer menu)
- JSONRPC debug: `exp.printCallCounterResult()` in dev console
- Log files accessible via View > Developer menu
- See `docs/LOGGING.md` for logging details

## Common Issues

- VS Code TypeScript errors: Use workspace TypeScript version
- Path length on Windows: Use short folder names (e.g., `c:\tmp`)
- macOS signing: Set `CSC_IDENTITY_AUTO_DISCOVERY=false` to skip

## Resources

- [Contributing Guide](./CONTRIBUTING.md)
- [Development Docs](./docs/DEVELOPMENT.md)
- [Styling Guide](./docs/STYLES.md)
- [Release Process](./RELEASE.md)
- [Delta Chat Core](https://github.com/chatmail/core)
