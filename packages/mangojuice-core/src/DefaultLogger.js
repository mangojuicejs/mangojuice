/**
 * Empty process logger class.
 * Defines an interface of commands execution logger.
 */
export class DefaultLogger {
  constructor(name, model) {
    this.name = name;
    this.model = model;
  }

  onStartExec(cmd, model) {}

  onStartHandling(cmd, model) {}

  onEndHandling(cmd, model) {}

  onCatchError(error, cmd, model) {
    console.error(error);
  }

  onExecuted(cmd, model, result) {}

  onEmitSubscriptions(cmd, model) {}

  onEndExec(cmd, model, result) {}
}

export default DefaultLogger;
