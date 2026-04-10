/**
 * ontelecho-storage.ts — Electron main-process persistence for Ontelecho state
 *
 * Stores the Ontelecho engine state (autonomy level, experiments, energy, cycles)
 * in a JSON file alongside the cognitive storage, and exposes IPC handlers for
 * the renderer to read/write state.
 */

import { app, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const STORAGE_FILE = 'ontelecho-state.json'

let storagePath: string
let state: Record<string, unknown> = {}
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function getStoragePath(): string {
  if (!storagePath) {
    const configDir = join(app.getPath('userData'), 'ontelecho')
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }
    storagePath = join(configDir, STORAGE_FILE)
  }
  return storagePath
}

function loadState(): Record<string, unknown> {
  try {
    const filePath = getStoragePath()
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8')
      state = JSON.parse(raw)
    }
  } catch (err) {
    console.error('[ontelecho-storage] Failed to load state:', err)
    state = {}
  }
  return state
}

function saveState(): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      writeFileSync(getStoragePath(), JSON.stringify(state, null, 2), 'utf-8')
    } catch (err) {
      console.error('[ontelecho-storage] Failed to save state:', err)
    }
    saveTimeout = null
  }, 500) // debounce writes
}

function saveStateImmediate(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  try {
    writeFileSync(getStoragePath(), JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('[ontelecho-storage] Failed to save state on shutdown:', err)
  }
}

/**
 * Initialize Ontelecho storage and register IPC handlers.
 * Returns a cleanup function for app shutdown.
 */
export function initOntelechoStorage(): () => void {
  loadState()

  // IPC: Get entire state
  ipcMain.handle('ontelecho:getState', () => {
    return state
  })

  // IPC: Set entire state
  ipcMain.handle(
    'ontelecho:setState',
    (_event: Electron.IpcMainInvokeEvent, newState: Record<string, unknown>) => {
      state = newState
      saveState()
      return true
    }
  )

  // IPC: Get a specific key
  ipcMain.handle(
    'ontelecho:get',
    (_event: Electron.IpcMainInvokeEvent, key: string) => {
      return state[key]
    }
  )

  // IPC: Set a specific key
  ipcMain.handle(
    'ontelecho:set',
    (
      _event: Electron.IpcMainInvokeEvent,
      key: string,
      value: unknown
    ) => {
      state[key] = value
      saveState()
      return true
    }
  )

  // IPC: Log an experiment result
  ipcMain.handle(
    'ontelecho:logExperiment',
    (_event: Electron.IpcMainInvokeEvent, experiment: Record<string, unknown>) => {
      if (!Array.isArray(state.experiments)) {
        state.experiments = []
      }
      ;(state.experiments as unknown[]).push(experiment)
      saveState()
      return true
    }
  )

  // Return cleanup function
  return () => {
    saveStateImmediate()
    ipcMain.removeHandler('ontelecho:getState')
    ipcMain.removeHandler('ontelecho:setState')
    ipcMain.removeHandler('ontelecho:get')
    ipcMain.removeHandler('ontelecho:set')
    ipcMain.removeHandler('ontelecho:logExperiment')
  }
}
