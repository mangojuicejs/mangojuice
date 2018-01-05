import { noop, maybeForEach } from '../utils';
import createCmd from '../cmd/cmd';


// Constants
const UPPERCASE_REGEX = /^_?[A-Z]/;

/**
 * By given logic class go through prototypes chain and
 * decorate all cmd functions. Use it if you can't use decorators
 * in your project
 *
 * It determine that the function should be converted to a command
 * factory (decorated by {@link cmd}) by its name. If the function
 * starts with uppercase letter or underscore+upper-letter, then it
 * is considered as a command.
 *
 * @example
 * class MyLogic {
 *   SomeCommand() {
 *   }
 *   _SomePrivateCommand() {
 *   }
 *   notACommand() {
 *     return 123;
 *   }
 * }
 *
 * // `SomeCommand` and `_SomePrivateCommand` will be decorated with `cmd`
 * // (the prorotype will be changed in-place). `notACommand` won't
 * // be decorated.
 * decorateLogic(MyLogic);
 *
 * const logic = new MyLogic();
 * logic.SomeCommand() // returns Command instance
 * logic._SomePrivateCommand() // returns Command instance
 * logic.notACommand() // returns 123
 * @param  {LogicBase} LogicClass   Logic class that you want to decorate
 * @param {bool} deep  If true then it will go though prototypes chain and
 *                     decorate every prototype in the chain.
 */
function decorateLogic(LogicClass, deep) {
  const proto = LogicClass.prototype || Object.getPrototypeOf(LogicClass);
  if (!proto || proto === Object.prototype) {
    return;
  }

  // Prepare next prototype in the chain
  if (deep) {
    decorateLogic(proto);
  }

  // Decorate all commands in the logic prototype
  maybeForEach(Object.getOwnPropertyNames(proto), k => {
    if (UPPERCASE_REGEX.test(k.charAt(0))) {
      const descr = Object.getOwnPropertyDescriptor(proto, k);
      if (!descr.get && descr.configurable) {
        Object.defineProperty(proto, k, createCmd(proto, k, descr));
      }
    }
  });

  return LogicClass;
}

export default decorateLogic;
