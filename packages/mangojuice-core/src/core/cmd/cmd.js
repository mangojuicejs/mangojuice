import { nextId, is } from "../utils";
import Command from '../../classes/Command';
import ensureCommand from './ensureCommand';


function createCommandFactory(name, func, opts) {
  const id = nextId();
  func.$$cmdId = id;
  const creator = function(...args) {
    return new Command(func, args, name, opts);
  };
  creator.id = id;
  creator.func = func;
  return creator;
}

export function cmd(obj, ...args) {
  if (is.func(obj)) {
    return ensureCommand(obj, ...args);
  }
  return {
    configurable: true,
    enumerable: true,
    value: createCommandFactory(name, descr.value, opts)
  };
}

export default cmd;
