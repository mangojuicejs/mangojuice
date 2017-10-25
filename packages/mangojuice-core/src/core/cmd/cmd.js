import { nextId, is } from "../utils";
import Command from '../../classes/Command';
import ensureCommand from './ensureCommand';


function createCommandFactory(name, func, ctx, opts) {
  const id = func.$$cmdId || nextId();
  const creator = function(...args) {
    const cmd = new Command(func, args, name, opts);
    cmd.model = ctx && ctx.model;
    return cmd;
  }

  func.$$cmdId = id;
  creator.id = id;
  creator.func = func;
  return creator;
}

export function cmd(obj, ...args) {
  if (is.func(obj)) {
    return createCommandFactory(obj.name, obj);
  }
  return {
    configurable: true,
    enumerable: true,
    value: createCommandFactory(name, descr.value, ctx)
  };
}

export default cmd;
