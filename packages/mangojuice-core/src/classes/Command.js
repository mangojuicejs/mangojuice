import { extend, is, nextId } from '../core/utils';


// Constants
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

/**
 * Class wihch represents a command to be execute by processor.
 * The command instance is immutable, so any function that
 * makes some change in the command will produce a new command
 * instead of changing the original one.
 * @param {Function} func
 * @param {Array<any>} args
 * @param {String} name [description]
 */
function Command(func, args, name, nonhandlable, options) {
  this.id = (func && func.__cmdId) || nextId();
  this.funcName = name;
  this.func = func;
  this.args = args || EMPTY_ARRAY;
  this.name = name;
  this.handlable = !nonhandlable;
  this.options = options || EMPTY_OBJECT;
}

extend(Command.prototype, {
  /**
   * Execute function incapsulated to the command in scope
   * of logic object.
   * @return {any}
   */
  exec() {
    return this.func && this.func.call(this.logic, ...this.args);
  },

  /**
   * Clone instance of the command
   * @return {Command}
   */
  clone() {
    const newCmd = new Command(
      this.func,
      this.args,
      this.funcName,
      !this.handlable,
      this.options
    );
    newCmd.id = this.id;
    newCmd.name = this.name;
    newCmd.model = this.model;
    newCmd.logic = this.logic;
    return newCmd;
  },

  /**
   * Check is the command associated with the same executor function.
   * You can pass command instance, command creator or executor function
   * as an argument.
   *
   * Second optional argument for checking is the command came from some
   * exact model. It is not needed if you got a command to compare using
   * `logicOf` function, because commands from `logicOf` binded to a model
   * you passed to it.
   * @param  {Function|Command|string}  cmd
   * @param  {Object}  model
   * @return {Boolean}
   */
  is(cmd, childModel) {
    if (!cmd) return false;
    const { func, name, model } = this;
    const isSameFunc = func === cmd.func || func === cmd || name === cmd;
    const isSameModel = isSameFunc && (
      (childModel && childModel === model) ||
      (!childModel && cmd.logic && cmd.logic.model === model) ||
      (!childModel && !cmd.logic)
    );
    return isSameFunc && isSameModel;
  },

  /**
   * Append arguments list to current list of arguments.
   * @param  {Array} args
   */
  appendArgs(args) {
    const newCmd = this.clone();
    newCmd.args = [].concat(this.args, args);
    return newCmd;
  },

  /**
   * Bind command to specified logic
   * @param  {object} logic
   */
  bind(logic) {
    const newCmd = this.clone();
    if (!logic) return newCmd;

    const ctxName = logic.constructor.name;
    newCmd.name = ctxName ? `${ctxName}.${this.funcName}` : this.funcName;
    newCmd.model = logic.model;
    newCmd.logic = logic;
    return newCmd;
  }
});

export default Command;
