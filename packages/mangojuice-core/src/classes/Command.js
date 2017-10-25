import { extend, is, emptyArray, nextId } from '../core/utils';


/**
 * Class wihch represents a command to be execute by processor.
 * @param {Function} func
 * @param {Array<any>} args
 * @param {String} name [description]
 * @param {Object} opts
 */
export function Command(func, args, name, opts) {
  this.id = func.$$cmdId || nextId();
  this.funcName = name;
  this.func = func;
  this.opts = opts;
  this.args = args || emptyArray;
  this.name = name;
};

extend(Command.prototype, {
  /**
   * Execute function incapsulated to the command in scope
   * of given logic object. Also append logic name to the name
   * of the command.
   * @param  {Object} logic
   * @return {any}
   */
  exec(logic) {
    const ctxName = logic && logic.constructor.name;
    this.name = ctxName ? `${ctxName}.${funcName}` : funcName;
    return this.func && this.func.call(logic, ...this.args);
  },

  /**
   * Clone instance of the command
   * @return {Command}
   */
  clone() {
    return new Command(this.func, this.args, this.opts, this.funcName);
  },

  /**
   * Check is the command associated with the same executor function.
   * You can pass command instance, command creator or executor function
   * as an argument.
   * Second optional argument for checking is the command
   * @param  {Function|Command|string}  cmd
   * @param  {Object}  model
   * @return {Boolean}
   */
  is(cmd, model) {
    return (
      cmd &&
      (this.func === cmd || this.func === cmd.func || this.name === cmd) &&
      (!model || this.model === model)
    );
  },

  /**
   * Append arguments list to current list of arguments.
   * @param  {Array} args
   */
  appendArgs(args) {
    this.args = [].concat(this.args, args);
  }
});

export default Command;
