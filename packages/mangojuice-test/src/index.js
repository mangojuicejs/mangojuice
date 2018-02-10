import { bind, utils, DefaultLogger, Process } from 'mangojuice-core';


class TrackableProcess extends Process {
  exec(...args) {
    super.exec(...args);
    return this.finished();
  }

  run(...args) {
    super.run(...args);
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
    onExecuted(cmd) {
      execOrder.push(cmd);
    }
    onStartExec(cmd) {
      commands.push(cmd);
      commandNames.push(cmd);
    }
  }

  try {
    const logger = new TrackerLogger();
    const appBind = bind(app, {
      Process: TrackableProcess,
      logger
    });

    const result = {
      commandNames,
      execOrder,
      commands,
      errors,
      app: appBind
    };

    const promise = appBind.proc.run().then(() => result);
    utils.extend(promise, result);
    return promise;
  } catch (e) {
    return Promise.reject(e);
  }
};
