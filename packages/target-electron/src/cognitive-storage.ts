/**
 * Electron IPC Storage Handlers for Deep Tree Echo Cognitive Framework
 *
 * This module provides the main process IPC handlers for the cognitive storage system.
 * The handlers support the ElectronStorageAdapter from @deltecho/cognitive package.
 *
 * Storage is JSON-based and persisted to the app's config directory.
 */

import { ipcMain } from 'electron'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

import { getConfigPath } from './application-constants.js'
import { getLogger } from '../../shared/logger.js'

const log = getLogger('main/cognitive-storage')

// In-memory cache for faster reads
const storageCache: Map<string, string> = new Map()

// Debounce timer for writes
let saveTimeout: NodeJS.Timeout | null = null
const SAVE_DEBOUNCE_MS = 100

/**
 * Get the storage file path
 */
function getStoragePath(): string {
  return join(getConfigPath(), 'cognitive-storage.json')
}

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    await mkdir(configPath, { recursive: true })
  }
}

/**
 * Load storage from disk into cache
 */
async function loadStorage(): Promise<void> {
  try {
    await ensureStorageDir()
    const storagePath = getStoragePath()

    if (existsSync(storagePath)) {
      const data = await readFile(storagePath, 'utf-8')
      const parsed = JSON.parse(data) as Record<string, string>

      storageCache.clear()
      for (const [key, value] of Object.entries(parsed)) {
        storageCache.set(key, value)
      }
      log.info(`Loaded ${storageCache.size} cognitive storage entries`)
    } else {
      log.info('No existing cognitive storage found, starting fresh')
    }
  } catch (error) {
    log.error('Failed to load cognitive storage:', error)
  }
}

/**
 * Save storage to disk (debounced)
 */
function scheduleSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(async () => {
    try {
      await ensureStorageDir()
      const storagePath = getStoragePath()
      const data: Record<string, string> = {}

      for (const [key, value] of storageCache.entries()) {
        data[key] = value
      }

      // Write to temp file first, then rename for atomicity
      const tempPath = `${storagePath}.tmp`
      await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8')

      // Rename temp to actual (atomic on most filesystems)
      const { rename } = await import('fs/promises')
      await rename(tempPath, storagePath)

      log.debug(`Saved ${storageCache.size} cognitive storage entries`)
    } catch (error) {
      log.error('Failed to save cognitive storage:', error)
    }
  }, SAVE_DEBOUNCE_MS)
}

/**
 * Force immediate save (for shutdown)
 */
async function saveImmediate(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }

  try {
    await ensureStorageDir()
    const storagePath = getStoragePath()
    const data: Record<string, string> = {}

    for (const [key, value] of storageCache.entries()) {
      data[key] = value
    }

    await writeFile(storagePath, JSON.stringify(data, null, 2), 'utf-8')
    log.info('Cognitive storage saved on shutdown')
  } catch (error) {
    log.error('Failed to save cognitive storage on shutdown:', error)
  }
}

/**
 * Initialize IPC handlers for cognitive storage
 */
export async function initCognitiveStorage(): Promise<() => Promise<void>> {
  log.info('Initializing cognitive storage handlers')

  // Load existing storage
  await loadStorage()

  // Handler: Get value by key
  ipcMain.handle('storage:get', async (_event, key: string) => {
    const value = storageCache.get(key)
    log.debug(`storage:get ${key} -> ${value ? 'found' : 'not found'}`)
    return value ?? null
  })

  // Handler: Set value by key
  ipcMain.handle('storage:set', async (_event, key: string, value: string) => {
    storageCache.set(key, value)
    scheduleSave()
    log.debug(`storage:set ${key}`)
    return true
  })

  // Handler: Delete key
  ipcMain.handle('storage:delete', async (_event, key: string) => {
    const deleted = storageCache.delete(key)
    if (deleted) {
      scheduleSave()
    }
    log.debug(`storage:delete ${key} -> ${deleted}`)
    return deleted
  })

  // Handler: Clear all keys with prefix
  ipcMain.handle('storage:clear', async (_event, prefix: string) => {
    const keysToDelete: string[] = []

    for (const key of storageCache.keys()) {
      if (key.startsWith(`${prefix}:`)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      storageCache.delete(key)
    }

    if (keysToDelete.length > 0) {
      scheduleSave()
    }

    log.debug(`storage:clear ${prefix} -> deleted ${keysToDelete.length} keys`)
    return keysToDelete.length
  })

  // Handler: List all keys with prefix
  ipcMain.handle('storage:keys', async (_event, prefix: string) => {
    const keys: string[] = []

    for (const key of storageCache.keys()) {
      if (key.startsWith(`${prefix}:`)) {
        keys.push(key)
      }
    }

    log.debug(`storage:keys ${prefix} -> found ${keys.length} keys`)
    return keys
  })

  log.info('Cognitive storage handlers initialized')

  // Return cleanup function
  return async () => {
    await saveImmediate()

    // Remove handlers
    ipcMain.removeHandler('storage:get')
    ipcMain.removeHandler('storage:set')
    ipcMain.removeHandler('storage:delete')
    ipcMain.removeHandler('storage:clear')
    ipcMain.removeHandler('storage:keys')

    log.info('Cognitive storage handlers cleaned up')
  }
}
