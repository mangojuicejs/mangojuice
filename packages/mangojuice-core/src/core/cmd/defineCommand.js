import cmd from './cmd';


/**
 * Provides a way to define a command in the prototype without
 * usign a decorator. You should give a prototype of the logic class,
 * name of the function which should be converted to a command factory
 * and the decorator function (optional).
 *
 * If the decorator function is not provided, then {@link cmd} will be used
 * by default.
 *
 * @example
 * class MyLogic {
 *   SomeCommand() {
 *     return { field: this.model.field + 1 };
 *   }
 *   // throttle 100
 *   ThrottledCommand() {
 *     return this.SomeCommand();
 *   }
 * }
 *
 * defineCommand(MyLogic.prototype, 'SomeCommand');
 * defineCommand(MyLogic.prototype, 'ThrottledCommand', cmd({ throttle: 100 }));
 * @param  {Object}    proto  Logic class prototype
 * @param  {string}    name   Method name that you want to convert to a command factory
 * @param  {?function} decorator  Optional decorator function
 */
export function defineCommand(proto, name, decorator) {
  const descr = Object.getOwnPropertyDescriptor(proto, name);
  const ensureDec = decorator || cmd;
  const newDescr = ensureDec(proto, name, descr);
  Object.defineProperty(proto, name, newDescr);
}

export default defineCommand;
