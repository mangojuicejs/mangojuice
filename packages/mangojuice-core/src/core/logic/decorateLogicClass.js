import { noop, maybeForEach } from '../utils';
import createCmd from '../cmd/cmd';


// The map to store decorated prorotypes to not mess
// the prototype object with anything
const DECORATED_PROTOS = typeof WeakMap !== 'undefined'
  ? new WeakMap() : { has: noop, set: noop };
const UPPERCASE_REGEX = /[A-Z]/;


/**
 * By given logic class go through prototypes chain and
 * decorate all cmd functions if "cmd" decorator is not used
 * in the logic (non-decorators mode).
 * @param  {Class} LogicClass
 */
function decorateLogicClass(LogicClass) {
  const proto = LogicClass.prototype || Object.getPrototypeOf(LogicClass);
  if (!proto || DECORATED_PROTOS.has(proto) || proto === Object.prototype) {
    return;
  }

  // Prepare next prototype in the chain
  decorateLogicClass(proto);

  // Decorate all commands in the logic prototype
  maybeForEach(Object.getOwnPropertyNames(proto), (k) => {
    if (UPPERCASE_REGEX.test(k.charAt(0))) {
      const descr = Object.getOwnPropertyDescriptor(proto, k);
      if (!descr.get && descr.configurable) {
        Object.defineProperty(proto, k, createCmd(proto, k, descr));
      }
    }
  });

  // Mark prototype as decorated
  DECORATED_PROTOS.set(proto, 1);
}

export default decorateLogicClass;
