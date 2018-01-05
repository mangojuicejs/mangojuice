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
function createCommandFactory(func, logic, name, options) {
  const id = func.__cmdId || nextId();

  const creator = function commandFactory(...args) {
    const cmd = new Command(func, args, name, options);
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
function createCommandDescriptor(options, obj, methodName, descr) {
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
        descr.value,
        haveModel ? this : null,
        methodName,
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
 * Decorator that converts a logic method to a command factory.
 * The result function (command factory function) is a function
 * that return a {@link Command} instnace with the decorated function
 * and arguments that you will pass to a command factory function.
 *
 * You can use this decorator without arguments or with an options
 * argument (object)
 *
 * Check {@link Process#exec} to see what the origin function
 * could return to do something. If in short, it can return:
 * nothing, command (or factory or array of commands), task,
 * model update object.
 *
 * @example
 * class RegularLogic {
 *   \@cmd RegularCommand() {
 *     // do something
 *   }
 * }
 * @example
 * class RegularLogic {
 *   \@cmd({ debounce: 300 })
 *   DebouncedCommand() {
 *     // if you will call this command 3 times every
 *     // 100ms then it will be executed 2 times,
 *     // first right when you call it for a first time,
 *     // and second in 600ms.
 *   }
 * }
 * @example
 * class RegularLogic {
 *   \@cmd({ throttle: 300 })
 *   ThrottledCommand() {
 *     // if you will call this command 3 times every
 *     // 100ms then it will be executed 2 times,
 *     // first right when you call it for a first time,
 *     // and second in 300ms.
 *   }
 * }
 * @example
 * class RegularLogic {
 *   \@cmd({ throttle: 300, noInitCall: true })
 *   ThrottledCommand() {
 *     // if you will call this command 3 times every
 *     // 100ms then it will be executed 1 time in 300ms.
 *   }
 * }
 * @example
 * class RegularLogic {
 *   \@cmd({ internal: true })
 *   _InternalCommand() {
 *     // this command can't be caught in `hubBefore` or `hubAfter`
 *     // in parent logics. Use it carefully.
 *   }
 * }
 * @param  {Object} obj           If only this argument passed then it will be considered
 *                                as options object which can customize command behaviour.
 * @param  {number} obj.debounce  If greeter than zero then an exeuction
 *                                of the command will be debounced by given amount of
 *                                milliseconds
 * @param  {number} obj.throttle  If greeter than zero then an exeuction
 *                                of the command will be throttled by given amount of
 *                                milliseconds
 * @param  {bool} obj.noInitCall  If true then debounced/throttled execution
 *                                won't start with init command call. By default
 *                                debounced/throttled command will be instantly
 *                                exected and only then wait for a chance to execute
 *                                again. With `noInitCall=true` there is no instant init
 *                                command call.
 * @param  {bool} obj.internal    Make the command invisible for parent {@link LogicBase#hubBefore}
 *                                and {@link LogicBase#hubAfter}. Use it for commands that shouldn't
 *                                be handled by hubs to increse performance.
 * @param {string} obj.name       By default name of the command taken from origin function. With this
 *                                option you can override the name with any other value.
 * @return {Function|object}      Command factory function (if all three arguemnts passed)
 *                                or a decorator function with binded options object
 *                                (that you pass as a first argument)
 */
export function cmd(obj, methodName, descr) {
  if (is.undef(methodName)) {
    return createCommandDescriptor.bind(null, obj);
  }
  return createCommandDescriptor(null, obj, methodName, descr);
}

export default cmd;
