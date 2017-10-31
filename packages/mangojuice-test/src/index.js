import { bind, DefaultLogger } from "mangojuice-core";


export const runWithTracking = async ({ expectErrors, app, shared } = {}) => {
  const commands = [];
  const commandNames = [];
  const errors = [];

  class TrackerLogger extends DefaultLogger {
    onCatchError(e) {
      if (!expectErrors) {
        throw e;
      }
      errors.push(e);
    }
    onStartExec(cmd) {
      commands.push(cmd);
      commandNames.push(cmd.name);
    }
  }

  const sharedBind = shared && (
    (shared.Logic && bind(shared, { logger: new TrackerLogger() })) ||
    { model: shared, proc: { run: () => {} } }
  );
  const appBind = app && bind(app, {
    logger: new TrackerLogger(),
    shared: sharedBind && sharedBind.model
  });

  await Promise.all([
    sharedBind && sharedBind.proc.run(),
    appBind && appBind.proc.run()
  ]);

  return {
    commandNames,
    commands,
    errors,
    app: appBind,
    shared: sharedBind
  };
};
