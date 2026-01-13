/**
 * Logger utility for Deep Tree Echo Orchestrator
 * Provides consistent logging across all orchestrator components
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  child: (subContext: string) => Logger;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const enableColors = process.env.NO_COLOR !== 'true';

const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  context: '\x1b[90m',
};

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

class OrchestratorLogger implements Logger {
  constructor(private context: string) {}

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  }

  private log(level: LogLevel, ...args: any[]) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const contextStr = `[${this.context}]`;

    let prefix: string;
    if (enableColors) {
      prefix = `${COLORS.context}${timestamp}${COLORS.reset} ${COLORS[level]}${levelStr}${COLORS.reset} ${COLORS.context}${contextStr}${COLORS.reset}`;
    } else {
      prefix = `${timestamp} ${levelStr} ${contextStr}`;
    }

    if (level === 'error') {
      console.error(prefix, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }

  debug(...args: any[]) {
    this.log('debug', ...args);
  }

  info(...args: any[]) {
    this.log('info', ...args);
  }

  warn(...args: any[]) {
    this.log('warn', ...args);
  }

  error(...args: any[]) {
    this.log('error', ...args);
  }

  child(subContext: string): Logger {
    return new OrchestratorLogger(`${this.context}:${subContext}`);
  }
}

export function getLogger(context: string): Logger {
  return new OrchestratorLogger(context);
}
