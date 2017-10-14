import { Run, DefaultLogger } from "mangojuice-core";


export const runWithTracking = async (props) => {
  const commands = [];
  const commandNames = [];
  const errors = [];
  class TrackerLogger extends DefaultLogger {
    onCatchError(e) {
      if (!props.expectErrors) {
        throw e;
      }
      errors.push(e);
    }
    onStartExec(cmd) {
      commands.push(cmd);
      commandNames.push(cmd.name);
    }
  }
  const res = Run.run({
    ...props,
    logger: TrackerLogger
  });
  await Promise.all([res.app.run, res.shared.run]);

  return {
    commandNames,
    commands,
    errors,
    ...res
  };
};
