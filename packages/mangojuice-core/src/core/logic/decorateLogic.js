import { noop, maybeForEach } from '../utils';
import createCmd from '../cmd/cmd';

// Constants
const UPPERCASE_REGEX = /[A-Z]/;

/**
 * By given logic class go through prototypes chain and
 * decorate all cmd functions (with first upper-case letter)
 * @param  {Class} LogicClass
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
