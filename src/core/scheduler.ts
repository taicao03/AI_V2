type AsyncTask = () => Promise<void>;

type SchedulerOptions = {
  minIntervalMs: number;
};

export type TaskScheduler = {
  schedule: (immediate?: boolean) => void;
  dispose: () => void;
};

export function createTaskScheduler(task: AsyncTask, options: SchedulerOptions): TaskScheduler {
  let timerId: number | null = null;
  let inFlight = false;
  let queued = false;
  let lastRunAt = 0;

  const run = () => {
    timerId = null;

    if (inFlight) {
      queued = true;
      return;
    }

    inFlight = true;
    lastRunAt = Date.now();

    void task().finally(() => {
      inFlight = false;

      if (queued) {
        queued = false;
        schedule(false);
      }
    });
  };

  const schedule = (immediate = false) => {
    if (timerId !== null) {
      return;
    }

    const elapsed = Date.now() - lastRunAt;
    const delay = immediate ? 0 : Math.max(0, options.minIntervalMs - elapsed);
    timerId = window.setTimeout(run, delay);
  };

  const dispose = () => {
    queued = false;
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  };

  return {
    schedule,
    dispose,
  };
}

