import { extend, is, emptyArray, nextId } from '../core/utils';


/**
 * Class wihch represents a command to be execute by processor.
 * @param {Function} func
 * @param {Array<any>} args
 * @param {String} name [description]
 * @param {Object} opts
 */
function Command(func, args, name, opts) {
  this.id = (func && func.__cmdId) || nextId();
  this.funcName = name;
  this.func = func;
  this.opts = opts;
  this.args = args || emptyArray;
  this.name = name;
};

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
    const cmd = new Command(this.func, this.args, this.funcName, this.opts);
    cmd.name = this.name;
    cmd.model = this.model;
    cmd.logic = this.logic;
    cmd.handlable = this.handlable;
    return cmd;
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
  is(cmd, childModel) {
    const { func, name, model } = this;
    return (
      cmd &&
      (func === cmd.func || func === cmd || name === cmd) &&
      (!childModel || childModel === model)
    );
  },

  /**
   * Append arguments list to current list of arguments.
   * @param  {Array} args
   */
  appendArgs(args) {
    this.args = [].concat(this.args, args);
    return this;
  },

  /**
   * Bind command to specified logic
   * @param  {object} logic
   */
  bind(logic) {
    const ctxName = logic && logic.constructor.name;
    this.name = ctxName ? `${ctxName}.${this.funcName}` : this.funcName;
    this.model = (logic && logic.model) || this.model;
    this.logic = logic;
    return this;
  }
});

export default Command;
