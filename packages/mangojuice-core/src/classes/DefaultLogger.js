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
 * // Pass instance of the Logger to {@link run}
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
  onStartExec(cmd) {},

  /**
   * Invoked right before command will go through all {@link LogicBase#hubBefore} or {@link LogicBase#hubAfter}
   * up in the blocks tree. The second argument indicates is it called for {@link LogicBase#hubBefore}
   * or for {@link LogicBase#hubAfter}.
   * @param  {Command}  cmd    Command that is going to go through hubs in parent blocks
   * @param  {Boolean} isAfter If true then the command is going through "after" hubs, "before" otherwise
   */
  onStartHandling(cmd, isAfter) {},

  /**
   * Invoked when the command went through all hubs and when all sync commands
   * returned from hubs was executed.
   * @param  {Command}  cmd     Command that went through all hubs
   * @param  {Boolean} isAfter  If true then the command going through "after" hubs, "before" otherwise
   */
  onEndHandling(cmd, isAfter) {},

  /**
   * Invoked when the command function executed and the return of the function processed –
   * all returned commands executed, all async tasks started, the model updated.
   * But it invoked before the command go through "after" hubs.
   * @param  {Command} cmd  Command that was exectued and the return processed
   * @param  {any} result   Returned object from the command's function
   */
  onExecuted(cmd, result) {},

  /**
   * Invoked right after the command go throught "after" hubs. It is the final
   * stage of command execution.
   * @param  {Command} cmd  Command that was fully executed and handled by parent blocks
   */
  onEndExec(cmd) {},

  /**
   * Invoked if any uncaught error happened while execution of the command
   * or anywhere else in the logic, like in {@link LogicBase#port} or in {@link LogicBase#computed}.
   * By default print the error using `console.error`.
   * @param  {Error} error  The error instance
   * @param  {?Command} cmd   Command that was executing while the error happened
   */
  onCatchError(error, cmd) {
    console.error(error);
  }
});

export default DefaultLogger;
