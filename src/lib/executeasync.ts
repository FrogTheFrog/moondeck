import { logger } from "./logger";

type VoidPromise = Promise<void>;
type AsyncCallback = () => VoidPromise;

export function executeAsyncWrapper(input: AsyncCallback | VoidPromise) {
  return () => {
    Promise.resolve()
      .then(async () => {
        if (typeof input === "function") {
          await input();
        } else {
          await input;
        }
      })
      .catch((e) => logger.critical(e));
  };
}

export function executeAsync(input: AsyncCallback | VoidPromise) {
  executeAsyncWrapper(input)();
}
