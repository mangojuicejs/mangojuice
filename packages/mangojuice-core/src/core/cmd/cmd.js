import { nextId, is } from '../utils';
import procOf from '../logic/procOf';
import Command from '../../classes/Command';
import ensureCommand from './ensureCommand';


/**
 * Creates a command object with given name and automatically
 * binded logic instance.
 *
 * @private
 * @param  {string}   name
 * @param  {object}   logic
 * @param  {bool}     nonhandlable
 * @param  {function} func
 * @param  {object}   options
 * @return {function}
 */
export function createCommandFactory(name, logic, nonhandlable, func, options) {
  const id = func.__cmdId || nextId();

  const creator = function commandFactory(...args) {
    const cmd = new Command(func, args, name, nonhandlable, options);
    return logic ? cmd.bind(logic) : cmd;
  };

  func.__cmdId = id;
  creator.id = id;
  creator.func = func;
  creator.logic = logic;
  return creator;
}

/**
 * Creates a object field descriptor with given options and
 * all data passed to class method decorator – prototype, method name,
 * etc.
 *
 * @private
 * @param  {object} options
 * @param  {object} obj
 * @param  {string} methodName
 * @param  {object} descr
 * @param  {bool}   nonhandlable
 * @param  {string} cmdName
 * @return {object}
 */
function createCommandDescriptor(options, obj, methodName, descr, nonhandlable, cmdName) {
  // Creates a descriptor with lazy factory creation and autobinding
  // to the instance of the logic, but only when some model exists
  // and command executed in scope of top-level prototype in prototypes
  // chain (to support calling "super" commands in extended logic)
  return {
    configurable: true,
    enumerable: true,
    get() {
      const haveModel = this && !!this.model && !!this.meta;
      const fromInstance = Object.getPrototypeOf(this) === obj;
      const factory = createCommandFactory(
        cmdName || methodName,
        haveModel ? this : null,
        nonhandlable,
        descr.value,
        options
      );
      if (haveModel && fromInstance) {
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

/**
 * Function should be used as a decorator to create
 * a Command factory function for makeing a command to
 * execute decorated function by Process.
 * @param  {object} obj
 * @param  {string} methodName
 * @param  {object} descr
 * @return {object}
 */
export function cmd(obj, methodName, descr, nonhandlable, cmdName) {
  if (is.undef(methodName)) {
    return createCommandDescriptor.bind(null, obj);
  }
  return createCommandDescriptor(null, obj, methodName, descr, nonhandlable, cmdName);
}

export default cmd;
