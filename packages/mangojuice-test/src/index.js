import { run, utils, procOf, DefaultLogger, Process } from 'mangojuice-core';


class TrackableProcess extends Process {
  exec(...args) {
    super.exec(...args);
    return this.finished();
  }

  run(...args) {
    super.run(...args);
    return this.finished();
  }

  update(...args) {
    super.update(...args);
    return this.finished();
  }
}

export function runWithTracking({ expectErrors, app } = {}) {
  const commands = [];
  const commandNames = [];
  const execOrder = [];
  const errors = [];

  class TrackerLogger extends DefaultLogger {
    onCatchError(e) {
      if (!expectErrors) {
        console.error(e);
        throw e;
      }
      errors.push(e);
    }
    onEndExec(proc, cmd) {
      execOrder.push(cmd);
    }
    onStartExec(proc, cmd) {
      commands.push(cmd);
      commandNames.push(cmd);
    }
  }

  try {
    const logger = new TrackerLogger();
    const runOptions = {
      Process: TrackableProcess,
      logger
    };
    const model = run(app, runOptions);
    const proc = procOf(model);

    const result = {
      commandNames,
      execOrder,
      commands,
      errors,
      app: { model, proc }
    };

    const promise = proc.finished().then(() => result);
    utils.extend(promise, result);
    return promise;
  } catch (e) {
    return Promise.reject(e);
  }
};
