import { AsyncCallback, TimeoutLoopResult, asyncLoop } from "./asyncloop";
import { Mutex } from "async-mutex";

export class IncrementalLoop {
  private readonly callback: AsyncCallback;
  private readonly timeout: number;
  private stopLoop: TimeoutLoopResult | null = null;
  private readonly mutex = new Mutex();
  private counter = 0;
  private deinitCalled = false;

  constructor(callback: AsyncCallback, timeout: number) {
    this.callback = callback;
    this.timeout = timeout;
  }

  async start(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      if (this.deinitCalled) {
        return;
      }

      if (this.stopLoop === null) {
        this.stopLoop = asyncLoop(this.callback, this.timeout);
      }

      this.counter++;
    } finally {
      release();
    }
  }

  async stop(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      if (this.counter === 0 || this.deinitCalled) {
        return;
      }

      if (--this.counter === 0) {
        await this.stopLoop?.();
        this.stopLoop = null;
      }
    } finally {
      release();
    }
  }

  async deinit(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.deinitCalled = true;

      if (this.stopLoop !== null) {
        await this.stopLoop();
        this.stopLoop = null;
      }
    } finally {
      release();
    }
  }
}
