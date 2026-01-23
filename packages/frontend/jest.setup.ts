/**
 * Jest Setup for Frontend Tests
 *
 * IMPORTANT: This file sets up global mocks for testing. Excessive mocking can hide bugs.
 *
 * Guidelines for mocking:
 * 1. MOCK: External WASM modules (can't run in jsdom)
 * 2. MOCK: Platform-specific APIs (Electron IPC, file system)
 * 3. MOCK: Browser APIs not available in jsdom (localStorage)
 * 4. DON'T MOCK: Business logic - test real behavior
 * 5. DON'T MOCK: State management - use real stores when possible
 *
 * Consider using Playwright E2E tests for integration scenarios instead of
 * adding more mocks here.
 */

import "@testing-library/jest-dom";

// =============================================================================
// ESSENTIAL MOCKS - Required for jsdom environment
// =============================================================================

/**
 * Mock WASM module - Cannot run WebAssembly in jsdom
 * This is a legitimate mock because WASM isn't supported in the test environment
 */
jest.mock(
  "@deltachat/message_parser_wasm",
  () => ({
    get_first_emoji: jest.fn().mockReturnValue(null),
    parse_text: jest.fn().mockReturnValue([]),
  }),
  { virtual: true },
);

/**
 * Mock runtime interface - Platform-specific (Electron/Tauri)
 *
 * NOTE: This mock provides a minimal interface. For integration testing,
 * consider using Playwright E2E tests instead of mocking everything.
 *
 * The mock tracks RPC calls so tests can verify correct API usage.
 */
jest.mock("@deltachat-desktop/runtime-interface", () => {
  const mockEmitter = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };

  // Track RPC calls for test assertions
  const rpcCalls: Array<{ method: string; args: unknown[] }> = [];

  const createRpcMock = () => {
    return new Proxy(
      {},
      {
        get: (_target, method: string) => {
          return jest.fn((...args: unknown[]) => {
            rpcCalls.push({ method, args });
            return Promise.resolve({});
          });
        },
      },
    );
  };

  return {
    runtime: {
      createDeltaChatConnection: jest.fn(() => ({
        rpc: createRpcMock(),
        on: jest.fn(),
        off: jest.fn(),
        getContextEvents: jest.fn(() => mockEmitter),
      })),
      getDesktopSettings: jest.fn().mockResolvedValue({}),
      setDesktopSetting: jest.fn().mockResolvedValue(true),
      deleteWebxdcAccountData: jest.fn(),
    },
    // Expose for test assertions
    __getRpcCalls: () => rpcCalls,
    __clearRpcCalls: () => {
      rpcCalls.length = 0;
    },
  };
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string): R;
      toHaveValue(value: string | number): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: Record<string, unknown>): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toContainElement(element: HTMLElement | null): R;
      toHaveLength(length: number): R;
    }
  }
}

// =============================================================================
// BROWSER API MOCKS - Not available in jsdom
// =============================================================================

/**
 * localStorage mock - jsdom doesn't persist storage
 * This implementation stores data so tests can verify storage operations
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    // Helpers for test assertions
    __getStore: () => ({ ...store }),
    __setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Window dialogs - not available in jsdom
// Default confirm to true so tests don't hang
window.confirm = jest.fn(() => true);
window.alert = jest.fn();

// Add TextEncoder/TextDecoder for jsdom (missing in some Node/Jest setups)
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Add Worker mock for jsdom (if missing)
if (typeof global.Worker === "undefined") {
  global.Worker = class {
    constructor() { }
    postMessage() { }
    terminate() { }
    onmessage() { }
    onerror() { }
    addEventListener() { }
    removeEventListener() { }
  } as any;
}

// Mock react-force-graph-2d as it's an ESM module that can't be parsed by some Jest configs
jest.mock("react-force-graph-2d", () => {
  return jest.fn(() => null);
});

// =============================================================================
// TEST LIFECYCLE
// =============================================================================

beforeEach(() => {
  // Clear localStorage between tests for isolation
  localStorageMock.clear();
  localStorageMock.__setStore({});
});

afterEach(() => {
  // Clear mock call history but preserve implementations
  jest.clearAllMocks();
});

// =============================================================================
// EXPORTED TEST UTILITIES
// =============================================================================

/**
 * Get the localStorage mock for test assertions
 * Usage: getLocalStorageMock().__getStore() to inspect stored values
 */
export const getLocalStorageMock = () => localStorageMock;
