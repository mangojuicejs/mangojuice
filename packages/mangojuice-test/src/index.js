import { Run, DefaultLogger } from "mangojuice-core";


export const runWithTracking = async (props) => {
  const commands = [];
  class TrackerLogger extends DefaultLogger {
    onStartExec(cmd) {
      commands.push(cmd);
    }
  }
  const res = Run.run({
    ...props,
    logger: TrackerLogger
  });
  await Promise.all([res.app.run, res.shared.run]);
  return {
    get commandNames() { return commands.map(x => x.name); },
    commands,
    ...res
  };
};
