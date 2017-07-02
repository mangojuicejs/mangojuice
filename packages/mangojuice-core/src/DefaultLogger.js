/**
 * Empty process logger class.
 * Defines an interface of commands execution logger.
 */
export default class DefaultLogger {
  constructor(name, model) {
    this.name = name;
    this.model = model;
  }

  onStartExec(cmd, model) {}

  onStartHandling(cmd, model) {}

  onEndHandling(cmd, model) {}

  onExecuted(cmd, model) {}

  onEmitSubscriptions(cmd, model) {}

  onEndExec(cmd, model) {}
}
