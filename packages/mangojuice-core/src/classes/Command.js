import { extend, is, nextId } from '../core/utils';


// Constants
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

/**
 * Class which declares a command that will be executed in the
 * future by some Process. It contains a function that will be
 * executed, arguments that should be passed to the function
 * and command name.
 *
 * The command also keep a context that should be used to execute
 * a function. Usually this context is some logic instance. You
 * can bind a context to the command using {@link Command#bind} function.
 *
 * The command instance is immutable, so any function that
 * makes some change in the command will produce a new command
 * instead of changing the original one.
 *
 * @class  Command
 * @property {Function} func  An origin function that should be executed
 * @property {Array<any>} args  A set of arguments that should be used
 *                              to execute the fucntion.
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

extend(Command.prototype, /** @lends Command.prototype */{
  /**
   * Execute a function stored in the command instance. It passes
   * stored arguments to the function and call it in stored context.
   * Returns the value that was returned form the function.
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
   * Check is the command equal to some other command or have
   * a reference to the same origin function. Optionally you can also
   * check that the command binded to some concrete model (using
   * the second argument).
   *
   * You can use many different formats to define the command to check:
   * - Just a string, which should be constructed like
   *   `Logic Class Name + Function Name`
   * - Command object or command factory that you can get from prorotype
   *   of some logic class.
   * - Binded command object or command factory that you can get from
   *   concrete model using {@link logicOf} function
   *
   * @example
   * class ChildLogic {
   *   \@cmd SomeCommand() {}
   * }
   * class MyLogic {
   *   hubAfter(cmd) {
   *     if (cmd.is('ChildLogic.SomeCommand')) {
   *       // by command name
   *     }
   *     if (cmd.is(ChildLogic.prorotype.SomeCommand)) {
   *       // by command factory
   *     }
   *     if (cmd.is(logicOf(this.model.child).SomeCommand)) {
   *       // by binded to a concrete model command factory (commands
   *       // binded for other models will be ignored)
   *     }
   *     if (cmd.is(ChildLogic.prorotype.SomeCommand, this.model.child)) {
   *       // by command factory and concrete child model (commands
   *       // binded for other models will be ignored)
   *     }
   *   }
   * }
   * @param  {Command|string}  cmd   Command object or command factory or command name
   * @param  {?Object}  childModel   Model object that should be binded to the command (optional)
   * @return {Boolean}               Returns `true` if the command have same name, or same origin function
   *                                 and binded to same model (if second argument provided)
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
   * Creates a new Command instance (clone the command) and append
   * given list of arguments to the current list of arguments.
   * Returns a new Command with new list of arguments.
   *
   * @param  {Array<any>} args  List of arguments that will be appened
   *                            to tne new Command
   * @return {Command}  New command with appended arguments
   */
  appendArgs(args) {
    const newCmd = this.clone();
    newCmd.args = [].concat(this.args, args);
    return newCmd;
  },

  /**
   * Creates a new Command instance and set given logic instance in it.
   * Also update command name by name of the origin function and name
   * of the logic class.
   *
   * @param  {LogicBase} logic  A logic instance that should be binded to a command
   * @return {Command} New command binded to given logic instance
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
