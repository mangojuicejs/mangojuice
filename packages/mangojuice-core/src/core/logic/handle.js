import observe from './observe';
import { extend } from '../utils';


function handleCmd(type, model, handler) {
  return observe(model, handler, { type });
}

/**
 * Function adds a handler to the {@link Process} attached to a given
 * model that will be invoked before every command running for this
 * model. The handler won't be invoked for commands from children
 * models of given model.
 *
 * Returns a function that removes the handler from the Process
 * (stop handling)
 *
 * @example
 * import { handleBefore, run, logicOf } from 'mangojuice-core';
 *
 * // Define root and child logic
 * class ChildLogic {
 *   \@cmd ChildCommand() {}
 * }
 * class MyLogic {
 *   children() {
 *     return { childModel: ChildLogic };
 *   }
 *   \@cmd RootCommand() {}
 * }
 *
 * // Run block with empty models
 * const res = run({
 *   Logic: MyLogic,
 *   createModel: () => ({ childModel: {} })
 * });
 *
 * // Adds a handler to a root model
 * handleBefore(res.model, (cmd) => console.log(cmd));
 *
 * // Run commands on root and child models
 * res.proc.exec(logicOf(res.model).RootCommand);
 * res.proc.exec(logicOf(res.model.childModel).ChildCommand);
 *
 * // In the console will be printed only `RootCommand` command object
 * // right before the command will be executed
 * @param  {Object} model       A model object with attached {@link Process}
 * @param  {Function} handler   A function that will be called before every own command
 * @return {Function} A function that stopps the handler
 */
export const handleBefore = handleCmd.bind(null, 'handlersBefore');

/**
 * It is the same as {@link handleBefore} but the handler will be invoked
 * **after** every own command.
 *
 * @param  {Object} model       A model object with attached {@link Process}
 * @param  {Function} handler   A function that will be called after every own command
 * @return {Function} A function that stopps the handler
 */
export const handleAfter = handleCmd.bind(null, 'handlersAfter');

/**
 * Alias for {@link handleAfter}
 *
 * @param  {Object} model       A model object with attached {@link Process}
 * @param  {Function} handler   A function that will be called after every own command
 * @return {Function} A function that stopps the handler
 */
export const handle = handleAfter;
