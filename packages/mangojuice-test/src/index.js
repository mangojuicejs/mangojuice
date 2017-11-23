import { bind, DefaultLogger } from 'mangojuice-core';


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
    const sharedBind =
      shared &&
      ((shared.Logic && bind(shared, { logger: new TrackerLogger() })) || {
        model: shared,
        proc: { run: () => {} }
      });

    const appBind =
      app &&
      bind(app, {
        logger: new TrackerLogger(),
        shared: sharedBind && sharedBind.model
      });

    return Promise.all([
      sharedBind && sharedBind.proc.run(),
      appBind && appBind.proc.run()
    ]).then(() => {
      return {
        commandNames,
        execOrder,
        commands,
        errors,
        app: appBind,
        shared: sharedBind
      };
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
