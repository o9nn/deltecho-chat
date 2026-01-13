"use strict";
import errorStackParser from "error-stack-parser";
const startTime = Date.now();
export const colorize = (light, code) => (str) => "\x1B[" + light + ";" + code + "m" + str + "\x1B[0m";
export const blue = colorize(1, 34);
export const red = colorize(1, 31);
export const yellow = colorize(1, 33);
export const grey = colorize(0, 37);
export const green = colorize(1, 37);
export const cyan = colorize(1, 36);
const emojiFontCss = 'font-family: Roboto, "Apple Color Emoji", NotoEmoji, "Helvetica Neue", Arial, Helvetica, NotoMono, sans-serif !important;';
export var LogLevelString = /* @__PURE__ */ ((LogLevelString2) => {
  LogLevelString2["DEBUG"] = "DEBUG";
  LogLevelString2["WARNING"] = "WARNING";
  LogLevelString2["INFO"] = "INFO";
  LogLevelString2["ERROR"] = "ERROR";
  LogLevelString2["CRITICAL"] = "CRITICAL";
  return LogLevelString2;
})(LogLevelString || {});
const LoggerVariants = [
  {
    log: console.debug,
    level: "DEBUG" /* DEBUG */,
    emoji: "\u{1F578}\uFE0F",
    symbol: "[D]"
  },
  {
    log: console.info,
    level: "INFO" /* INFO */,
    emoji: "\u2139\uFE0F",
    symbol: blue("[i]")
  },
  {
    log: console.warn,
    level: "WARNING" /* WARNING */,
    emoji: "\u26A0\uFE0F",
    symbol: yellow("[w]")
  },
  {
    log: console.error,
    level: "ERROR" /* ERROR */,
    emoji: "\u{1F6A8}",
    symbol: red("[E]")
  },
  {
    log: console.error,
    level: "CRITICAL" /* CRITICAL */,
    emoji: "\u{1F6A8}\u{1F6A8}",
    symbol: red("[C]")
  }
];
export function printProcessLogLevelInfo() {
  console.info(
    `%cLogging Levels:
${LoggerVariants.map((v) => `${v.emoji} ${v.level}`).join(
      "\n"
    )}`,
    emojiFontCss
  );
  console.info(
    `# Tips and Tricks for using the search filter in the browser console:

\u2022 Use space to separate search terms
\u2022 Exclude search terms using -
\u2022 If the search term contains spaces you should escape it with ""

Examples:

\u{1F578}\uFE0F          only show debug messages
-\u{1F578}\uFE0F         don't show debug messages
\u2139\uFE0F          only show info messages
-\u2139\uFE0F         don't show info messages
\u{1F47B}          only show events from background accounts (not selected accounts)
-\u{1F47B}         don't show events from background accounts (not selected accounts)
\u{1F4E1}          only show events
-\u{1F4E1}         don't show any events
[JSONRPC]   only show jsonrpc messages
-[JSONRPC]  don't show jsonrpc messages

Start deltachat with --devmode (or --log-debug and --log-to-console) argument to show full log output.
If the log seems quiet, make sure the 'All levels' drop down has 'Verbose' checked.
  `
  );
}
let handler;
let rc = {};
export function setLogHandler(LogHandler, rcObject) {
  handler = LogHandler;
  rc = rcObject;
}
function log({ channel, isMainProcess }, level, stacktrace, args) {
  const variant = LoggerVariants[level];
  if (!handler) {
    console.log("Failed to log message - Handler not initialized yet");
    console.log(`Log Message: ${channel} ${level} ${args.join(" ")}`);
    throw Error("Failed to log message - Handler not initialized yet");
  }
  handler(channel, variant.level, stacktrace, ...args);
  if (rc["log-to-console"]) {
    if (isMainProcess) {
      const beginning = `${Math.round((Date.now() - startTime) / 100) / 10}s ${LoggerVariants[level].symbol}${grey(channel)}:`;
      if (!stacktrace) {
        variant.log(beginning, ...args);
      } else {
        variant.log(
          beginning,
          ...args,
          red(
            Array.isArray(stacktrace) ? stacktrace.map((s) => `
${s.toString()}`).join() : stacktrace
          )
        );
      }
    } else {
      const prefix = `%c${variant.emoji}%c${channel}`;
      const prefixStyle = [emojiFontCss, "color:blueviolet;"];
      if (stacktrace) {
        variant.log(prefix, ...prefixStyle, stacktrace, ...args);
      } else {
        variant.log(prefix, ...prefixStyle, ...args);
      }
    }
  }
}
function getStackTrace() {
  const rawStack = errorStackParser.parse(
    new Error("Get Stacktrace")
  );
  const stack = rawStack.slice(2, rawStack.length);
  return rc["machine-readable-stacktrace"] ? stack : stack.map((s) => `
${s.toString()}`).join();
}
export class Logger {
  constructor(channel) {
    this.channel = channel;
    //@ts-ignore
    this.isMainProcess = typeof window === "undefined";
    if (channel === "core/event") {
      this.getStackTrace = () => "";
    }
  }
  getStackTrace() {
    const rawStack = errorStackParser.parse(
      new Error("Get Stacktrace")
    );
    const stack = rawStack.slice(2, rawStack.length);
    return rc["machine-readable-stacktrace"] ? stack : stack.map((s) => `
${s.toString()}`).join();
  }
  debug(...args) {
    if (!rc["log-debug"]) return;
    log(this, 0, "", args);
  }
  info(...args) {
    log(this, 1, "", args);
  }
  warn(...args) {
    log(this, 2, this.getStackTrace(), args);
  }
  error(...args) {
    log(this, 3, this.getStackTrace(), args);
  }
  /** use this when you know that the stacktrace is not relevant */
  errorWithoutStackTrace(...args) {
    log(this, 3, [], args);
  }
  critical(...args) {
    log(this, 4, this.getStackTrace(), args);
  }
}
export function getLogger(channel) {
  return new Logger(channel);
}
if (!("toJSON" in Error.prototype))
  Object.defineProperty(Error.prototype, "toJSON", {
    value: function() {
      const alt = {};
      Object.getOwnPropertyNames(this).forEach(function(key) {
        alt[key] = this[key];
      }, this);
      return alt;
    },
    configurable: true,
    writable: true
  });
//# sourceMappingURL=logger.js.map
