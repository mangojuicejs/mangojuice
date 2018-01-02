import { extend, is } from '../core/utils';


/**
 * Empty class which is doing nothing. Needed only for defining
 * a type of this class using Flow/TypeScript to be able to
 * use types more aggressively
 *
 * @class  LogicBase
 */
function LogicBase() {
}


extend(LogicBase.prototype, /** @lends LogicBase.prototype */{
  /**
   * A function that defines init commands and meta object of the
   * logic. Can accept any type and number of arguments. Config
   * will take arguments passed to `child` function.
   * @return {Object}
   */
  config() {},

  /**
   * This function defines what logic class should be associated
   * with which model field. Should return an object where key is
   * a model field name, and value is a logic class or an object
   * that defines logic with arguments (return from `child` function)
   *
   * @return {Object}
   */
  children() {},

  /**
   * Should return an object which defines computed fields of the model.
   * Key of the object is a model field, and value is a function or
   * computed function definition object (return from `depends` function)
   *
   * @return {Object}
   */
  computed() {},

  /**
   * Function for defining handlers for event from the "world", like websocket,
   * global browser mouse/keyboard events or timeouts/intervals.
   * @param  {Function} exec
   * @param  {Promise} destroyed
   */
  port(exec, destroyed) {},

  /**
   * Hub for all commands executed down in the blocks tree. The only
   * arguments is a command object that was executed.
   * Could return a Command or an array of Commands that should
   * be executed next.
   * @param  {Command} cmd
   * @return {?Command|?Array<Command>}
   */
  hub(cmd) {},

  /**
   * An alias for `hub`
   * @param  {Command} cmd
   * @return {?Command|?Array<Command>}
   */
  hubAfter(cmd) {},

  /**
   * Same as `hubAfter`, but catch commands before it will be executed.
   * @param  {Command} cmd
   * @return {?Command|?Array<Command>}
   */
  hubBefore(cmd) {}
});

export default LogicBase;
