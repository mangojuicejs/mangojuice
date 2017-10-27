import { nextId, is } from "../utils";
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
function createCommandFactory(name, func, ctx, opts) {
  const id = func.__cmdId || nextId();
  const creator = function(...args) {
    const cmd = new Command(func, args, name, opts);
    cmd.bind(ctx);
    return cmd;
  }

  func.__cmdId = id;
  creator.id = id;
  creator.func = func;
  return creator;
}

/**
 * Function can be used as a decorator or as a regular function
 * to create a Command factory function for makeing a command to
 * execute decorated (or given as first argument) function.
 * @param  {object|function}    obj
 * @param  {string} name
 * @param  {object} descr
 * @return {object|function}
 */
export function cmd(obj, name, descr) {
  if (is.func(obj)) {
    return createCommandFactory(obj.name, obj);
  }
  return {
    configurable: true,
    enumerable: true,
    get() {
      const factory = createCommandFactory(name, descr.value, this);
      Object.defineProperty(this, name, {
        value: factory,
        configurable: true,
        enumerable: true
      });
      return factory;
    }
  };
}

export default cmd;
