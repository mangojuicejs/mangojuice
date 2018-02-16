import { extend } from '../core/utils';


/**
 * A class which defins a logger for tracking command execution process.
 * The default implmenetation just defines all possible logger
 * methods (log points) and print errors to the console.
 * Extend this class to define your own logging functionality
 * (like logging errors with Setnry or Loggly)
 *
 * @class  DefaultLogger
 * @example
 * // ./index.js
 * import { DefaultLogger, run } from 'mangojuice-core';
 * import MainBlock from './blocks/MainBlock';
 *
 * // Implement custom logger
 * class SetnryLogger extends DefaultLogger {
 *   onCatchError(error, cmd) {
 *     Raven.catchException(error);
 *   }
 * }
 *
 * // Pass instance of the Logger to `run` options object.
 * run(MainBlock, { logger: new SetnryLogger() });
 */
function DefaultLogger() {
}

extend(DefaultLogger.prototype, /** @lends DefaultLogger.prototype */{
  /**
   * This method invoked right before anything else - as the first thing
   * in {@link Process#exec}. Even before any {@link LogicBase#hubBefore}.
   * @param  {Command} cmd  Command that just started execution process
   */
  onStartExec(proc, cmd) {},

  /**
   * Invoked right after the command go throught "after" hubs. It is the final
   * stage of command execution.
   * @param  {Command} cmd  Command that was fully executed and handled by parent blocks
   */
  onEndExec(proc, cmd) {},

  /**
   * Invoked if any uncaught error happened while execution of the command
   * or anywhere else in the logic, like in {@link LogicBase#port} or in {@link LogicBase#computed}.
   * By default print the error using `console.error`.
   * @param  {Error} error  The error instance
   * @param  {?Command} cmd   Command that was executing while the error happened
   */
  onCatchError(error, proc, cmd) {
    console.error(error);
  }
});

export default DefaultLogger;
