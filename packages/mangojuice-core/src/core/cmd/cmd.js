import { nextId } from "../utils";
import procOf from '../logic/procOf';
import Command from '../../classes/Command';
import ensureCommand from './ensureCommand';


/**
 * Creates a Command factory function, which makes a command
 * binded to a model from given context.
 * @param  {string} name
 * @param  {function} func
 * @param  {object} ctx
 * @param  {?object} opts
 * @return {function}
 */
export function createCommandFactory(name, logic, nonhandlable, func) {
  const id = func.__cmdId || nextId();

  const creator = function commandFactory(...args) {
    const cmd = new Command(func, args, name, nonhandlable);
    return logic ? cmd.bind(logic) : cmd;
  }

  func.__cmdId = id;
  creator.id = id;
  creator.func = func;
  creator.logic = logic;
  return creator;
}

/**
 * Function should be used as a decorator to create
 * a Command factory function for makeing a command to
 * execute decorated function by Process.
 * @param  {object}    obj
 * @param  {string} methodName
 * @param  {object} descr
 * @return {object}
 */
export function cmd(obj, methodName, descr, nonhandlable, cmdName) {
  // Disable auto-decaration in Process
  obj.__decorated = true;

  // Creates a descriptor with lazy factory creation and autobinding
  // to the instance of the logic, but only when some model exists
  // and command executed in scope of top-level prototype in prototypes
  // chaon (to support calling "super" commands in extended logic)
  return {
    __func: descr.value,
    configurable: true,
    enumerable: true,
    get() {
      const factory = createCommandFactory(cmdName || methodName, this, nonhandlable, descr.value);
      if (this && this.model && Object.getPrototypeOf(this) === obj) {
        Object.defineProperty(this, methodName, {
          configurable: false,
          enumerable: true,
          value: factory
        });
      }
      return factory;
    }
  };
}

export default cmd;
