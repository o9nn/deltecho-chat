import '@testing-library/jest-dom'

// Set up global type definitions for testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveTextContent(text: string): R
      toHaveValue(value: string | number): R
      toBeDisabled(): R
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
