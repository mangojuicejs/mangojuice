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

export function runWithTracking({ expectErrors, app, shared } = {}) {
  const commands = [];
  const commandNames = [];
  const execOrder = [];
  const errors = [];

  class TrackerLogger extends DefaultLogger {
    onCatchError(e) {
      if (!expectErrors) {
        throw e;
      }
      errors.push(e);
    }
    onExecuted(cmd) {
      execOrder.push(cmd.name);
    }
    onStartExec(cmd) {
      commands.push(cmd);
      commandNames.push(cmd.name);
    }
  }

  try {
    const logger = new TrackerLogger();
    let sharedBind, appBind;

    if (shared) {
      if (shared.Logic) {
        sharedBind = bind(shared, {
          Process: TrackableProcess,
          logger
        });
      } else {
        sharedBind = {
          model: shared,
          proc: { run: () => {} }
        };
      }
    }

    if (app) {
      appBind = bind(app, {
        Process: TrackableProcess,
        shared: sharedBind && sharedBind.model,
        logger
      });
    }

    const result = {
      commandNames,
      execOrder,
      commands,
      errors,
      app: appBind,
      shared: sharedBind
    };

    const promise = Promise.all([
      sharedBind && sharedBind.proc.run(),
      appBind && appBind.proc.run()
    ]).then(() => result);

    utils.extend(promise, result);
    return promise;
  } catch (e) {
    return Promise.reject(e);
  }
};
