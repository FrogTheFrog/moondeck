import { logger } from "./logger";

type AsyncCallback = () => Promise<void>;

export function executeAsyncWrapper(callback: AsyncCallback) {
  return () => {
    Promise.resolve()
      .then(async () => {
        await callback();
      })
      .catch((e) => logger.critical(e));
  };
}

export function executeAsync(callback: AsyncCallback) {
  executeAsyncWrapper(callback)();
}
