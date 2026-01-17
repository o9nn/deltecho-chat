import '@testing-library/jest-dom'

// Mock the message_parser_wasm module globally (virtual module - may not exist in node_modules)
jest.mock(
  '@deltachat/message_parser_wasm',
  () => ({
    get_first_emoji: jest.fn().mockReturnValue(null),
    parse_text: jest.fn().mockReturnValue([]),
  }),
  { virtual: true }
)

// Mock the runtime interface globally for tests
jest.mock('@deltachat-desktop/runtime-interface', () => {
  const mockEmitter = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  }

  return {
    runtime: {
      createDeltaChatConnection: jest.fn(() => ({
        rpc: new Proxy({}, {
          get: () => jest.fn().mockResolvedValue({})
        }),
        on: jest.fn(),
        off: jest.fn(),
        getContextEvents: jest.fn(() => mockEmitter),
      })),
      getDesktopSettings: jest.fn().mockResolvedValue({}),
      setDesktopSetting: jest.fn().mockResolvedValue(true),
      deleteWebxdcAccountData: jest.fn(),
    }
  }
})

// Set up global type definitions for testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveTextContent(text: string): R
      toHaveValue(value: string | number): R
      toBeDisabled(): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveClass(className: string): R
      toHaveStyle(style: Record<string, any>): R
      toBeVisible(): R
      toBeChecked(): R
      toContainElement(element: HTMLElement | null): R
      toHaveLength(length: number): R
    }
  }
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window functions
window.confirm = jest.fn()
window.alert = jest.fn()

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})
