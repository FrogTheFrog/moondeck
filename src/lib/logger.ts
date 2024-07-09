import { toaster } from "@decky/api";

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
  }

  log(...args: unknown[]): void {
    console.log(
      "%c MoonDeck %c Info %c",
      "background: #16a085; color: black;",
      "background: #1abc9c; color: black;",
      "background: transparent;",
      ...args
    );
  }

  warn(...args: unknown[]): void {
    console.log(
      "%c MoonDeck %c Warning %c",
      "background: #16a085; color: black;",
      "background: #FFEA35; color: black;",
      "background: transparent;",
      ...args
    );
  }

  error(...args: unknown[]): void {
    console.log(
      "%c MoonDeck %c Error %c",
      "background: #16a085; color: black;",
      "background: #FF3A35; color: black;",
      "background: transparent;",
      ...args
    );
  }

  critical(...args: unknown[]): void {
    console.error(
      "%c MoonDeck %c Critical:",
      "background: #16a085; color: black;",
      "background: transparent;",
      ...args
    );
  }
}

export const logger = new Logger();
