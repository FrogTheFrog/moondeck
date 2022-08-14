import { logger } from "./logger";
import { sleep } from "decky-frontend-lib";

export type AsyncCallback = () => void | Promise<void>;
export type TimeoutLoopResult = () => Promise<void>;

export function asyncLoop(callback: AsyncCallback, timeout: number): TimeoutLoopResult {
  let notifyStartReady: (() => void);
  let notifyStop: (() => void);
  let keepRunning = true;

  const startReady = Promise.resolve(new Promise<void>((resolve) => { notifyStartReady = resolve; }));
  const loopStoped = Promise.resolve(new Promise<void>((resolve) => { notifyStop = resolve; notifyStartReady(); }));
  const stopLoop = async (): Promise<void> => {
    keepRunning = false;
    return await loopStoped;
  };

  const execute = async (): Promise<void> => {
    await startReady;

    while (keepRunning) {
      try {
        await callback();
      } catch (error) {
        keepRunning = true;
        logger.critical(error);
      }

      if (keepRunning) {
        await sleep(timeout);
      }
    }

    notifyStop?.();
  };
  execute().catch((e) => logger.critical(e)).finally(() => notifyStop?.());

  return stopLoop;
}
