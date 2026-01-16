/**
 * Electron Main Process adapter for eventa
 *
 * Enables communication from the main process to renderer
 */

import type { Subscription, TransportAdapter, WireMessage } from '../../types.js';

/**
 * Electron IPC types (minimal interface)
 */
export interface ElectronIpcMain {
    on(channel: string, listener: (event: { sender: unknown }, ...args: unknown[]) => void): void;
    removeListener(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
}

export interface ElectronWebContents {
    send(channel: string, ...args: unknown[]): void;
}

const EVENTA_CHANNEL = 'eventa:message';

/**
 * Create an eventa transport adapter for Electron main process
 *
 * @example
 * ```typescript
 * import { createContext } from '@deltecho/eventa';
 * import { createMainAdapter } from '@deltecho/eventa/adapters/electron/main';
 * import { ipcMain, BrowserWindow } from 'electron';
 *
 * const mainWindow = new BrowserWindow({ ... });
 * const { adapter } = createMainAdapter(ipcMain, mainWindow.webContents);
 *
 * const ctx = createContext();
 * ctx.attachTransport(adapter);
 * ```
 */
export function createMainAdapter(
    ipcMain: ElectronIpcMain,
    webContents: ElectronWebContents
): { adapter: TransportAdapter } {
    let messageHandler: ((message: WireMessage) => void) | null = null;

    const ipcListener = (_event: { sender: unknown }, ...args: unknown[]) => {
        const message = args[0] as WireMessage;
        if (messageHandler && message) {
            messageHandler(message);
        }
    };

    ipcMain.on(EVENTA_CHANNEL, ipcListener);

    const adapter: TransportAdapter = {
        send(message: WireMessage): void {
            webContents.send(EVENTA_CHANNEL, message);
        },

        onMessage(handler: (message: WireMessage) => void): Subscription {
            messageHandler = handler;
            return {
                unsubscribe: () => {
                    messageHandler = null;
                    ipcMain.removeListener(EVENTA_CHANNEL, ipcListener as (event: unknown, ...args: unknown[]) => void);
                },
            };
        },

        close(): void {
            ipcMain.removeListener(EVENTA_CHANNEL, ipcListener as (event: unknown, ...args: unknown[]) => void);
        },
    };

    return { adapter };
}

/**
 * Create adapters for multiple browser windows
 */
export function createMultiWindowMainAdapter(
    ipcMain: ElectronIpcMain
): {
    registerWindow(id: string, webContents: ElectronWebContents): TransportAdapter;
    unregisterWindow(id: string): void;
    broadcast(message: WireMessage): void;
} {
    const windows = new Map<string, ElectronWebContents>();
    const handlers = new Map<string, (message: WireMessage) => void>();

    ipcMain.on(EVENTA_CHANNEL, (_event, ...args: unknown[]) => {
        const message = args[0] as WireMessage & { windowId?: string };
        // Find the handler for this sender
        for (const [_id, handler] of handlers) {
            handler(message);
        }
    });

    return {
        registerWindow(id: string, webContents: ElectronWebContents): TransportAdapter {
            windows.set(id, webContents);

            return {
                send(message: WireMessage): void {
                    webContents.send(EVENTA_CHANNEL, message);
                },

                onMessage(handler: (message: WireMessage) => void): Subscription {
                    handlers.set(id, handler);
                    return {
                        unsubscribe: () => {
                            handlers.delete(id);
                        },
                    };
                },

                close(): void {
                    windows.delete(id);
                    handlers.delete(id);
                },
            };
        },

        unregisterWindow(id: string): void {
            windows.delete(id);
            handlers.delete(id);
        },

        broadcast(message: WireMessage): void {
            for (const webContents of windows.values()) {
                webContents.send(EVENTA_CHANNEL, message);
            }
        },
    };
}
