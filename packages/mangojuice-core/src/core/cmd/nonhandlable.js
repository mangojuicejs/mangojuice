import { is } from "../utils";


/**
 * Makes command or command factory to be non handlable
 * by any handlers. Usefull for high-frquency commands
 * which shouldn't be handled by any parent, such as
 * handler commands.
 * @param  {Funtion|Object} obj
 * @param  {string} name
 * @param  {Object} descr
 * @return {Object|Function}
 */
function nonhandlable(obj, name, descr) {
  if (is.func(obj)) {
    obj.handlable = false;
    return obj;
  }
  return {
    configurable: true,
    enumerable: true,
    get() {
      const factory = descr.get ? descr.get.call(this) : descr.value;
      factory.handlable = false;
      return factory;
    }
  };
}

export default nonhandlable;
