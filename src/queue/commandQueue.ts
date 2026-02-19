/**
 * Simple in-memory command queue with concurrency control.
 * Limits the number of commands processed simultaneously.
 * Designed for small team usage (< 20 users, ~4-5 concurrent commands).
 */

interface QueueItem {
  task: () => Promise<void>;
  resolve: () => void;
  reject: (error: any) => void;
}

export class CommandQueue {
  private concurrency: number;
  private running: number = 0;
  private queue: QueueItem[] = [];

  constructor(concurrency: number = 5) {
    this.concurrency = concurrency;
  }

  /**
   * Enqueue a command task for execution.
   * If under the concurrency limit, executes immediately.
   * Otherwise, waits in the queue until a slot is available.
   */
  async enqueue(task: () => Promise<void>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;

    try {
      await item.task();
      item.resolve();
    } catch (error) {
      console.error("CommandQueue: Error processing task:", error);
      item.reject(error);
    } finally {
      this.running--;
      this.processNext();
    }
  }

  /** Get current queue stats for monitoring */
  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      concurrency: this.concurrency,
    };
  }
}

// Singleton instance — max 5 concurrent commands
export const commandQueue = new CommandQueue(5);
