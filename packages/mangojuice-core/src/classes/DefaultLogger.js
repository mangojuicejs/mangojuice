import { extend } from '../core/utils';

/**
 * Empty process logger class.
 * Defines an interface of commands execution logger.
 * @class  DefaultLogger
 */
function DefaultLogger(name, model) {
  this.name = name;
  this.model = model;
}

extend(DefaultLogger.prototype, /** @lends DefaultLogger.prototype */{
  onStartExec(cmd) {},
  onStartHandling(cmd) {},
  onEndHandling(cmd) {},
  onExecuted(cmd, result) {},
  onEndExec(cmd, result) {},
  onCatchError(error, cmd) {
    console.error(error);
  }
});

export default DefaultLogger;
