/**
 * Provides a way to define a command in the prototype without
 * usign a decorator. You should give a prototype of the logic class,
 * name of the fuction which should be converted to a command factory
 * and the decorator function. The decorator function soulc be `cmd`
 * or return from `debounce` or `throttle`.
 * @param  {Object}    proto
 * @param  {string}    name
 * @param  {function}  decorator
 */
export function defineCommand(proto, name, decorator, ...args) {
  const descr = Object.getOwnPropertyDescriptor(proto, name);
  const newDescr = decorator(proto, name, descr, ...args);
  Object.defineProperty(proto, name, newDescr);
}

export default defineCommand;
