import { call, toaster } from "@decky/api";
import { inspect } from "loupe";

function serialize(...args: unknown[]) {
  return args.map((arg) => typeof arg === "string" ? arg : inspect(arg)).join(" ");
}

function criticalConsoleLog(...args: unknown[]) {
  console.error(
    "%c MoonDeck %c Critical:",
    "background: #16a085; color: black;",
    "background: transparent;",
    ...args
  );
}

function executeAsyncSafe(input: Promise<void>) {
  Promise.resolve(input).catch((e) => criticalConsoleLog(e));
}

type PythonLogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
async function frontendLogEntry(level: PythonLogLevel, ...args: unknown[]): Promise<void> {
  try {
    await call<[PythonLogLevel, string], unknown>("frontend_log_entry", level, serialize(...args));
  } catch (message) {
    criticalConsoleLog("Error while trying to save frontend log: ", message);
  }
}

class Logger {
  toast(entry: string, options: { duration?: number; output?: "debug" | "log" | "warn" | "error" | null } = {}): void {
    const { duration = 5000, output = "log" } = options;
    const critical = output === "error";
    toaster.toast({ title: "MoonDeck", body: entry, duration, critical });

    switch (output) {
      case "debug":
        this.log(entry);
        break;
      case "log":
        this.log(entry);
        break;
      case "warn":
        this.warn(entry);
        break;
      case "error":
        this.error(entry);
        break;
      default:
        break;
    }
  }

  debug(...args: unknown[]): void {
    console.debug(
      "%c MoonDeck %c Debug %c",
      "background: #16a085; color: black;",
      "background: #1abc9c; color: black;",
      "background: transparent;",
      ...args
    );
    executeAsyncSafe(frontendLogEntry("DEBUG", ...args));
  }

  log(...args: unknown[]): void {
    console.log(
      "%c MoonDeck %c Info %c",
      "background: #16a085; color: black;",
      "background: #1abc9c; color: black;",
      "background: transparent;",
      ...args
    );
    executeAsyncSafe(frontendLogEntry("INFO", ...args));
  }

  warn(...args: unknown[]): void {
    console.log(
      "%c MoonDeck %c Warning %c",
      "background: #16a085; color: black;",
      "background: #FFEA35; color: black;",
      "background: transparent;",
      ...args
    );
    executeAsyncSafe(frontendLogEntry("WARNING", ...args));
  }

  error(...args: unknown[]): void {
    console.log(
      "%c MoonDeck %c Error %c",
      "background: #16a085; color: black;",
      "background: #FF3A35; color: black;",
      "background: transparent;",
      ...args
    );
    executeAsyncSafe(frontendLogEntry("ERROR", ...args));
  }

  critical(...args: unknown[]): void {
    criticalConsoleLog(...args);
    executeAsyncSafe(frontendLogEntry("CRITICAL", ...args));
  }
}

export const logger = new Logger();
