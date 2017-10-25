import { ensureCmdObject } from './cmd';


/**
 * Creates an object which describes child logic which will
 * be attached to some model field.
 * @param  {Class} logic
 * @return {Object}
 */
export function child(logic, ...args) {
  return {
    logic,
    configArgs: args,
    handler(handler) {
      this.execHandler = ensureCmdObject(handler);
      return this;
    }
  };
}

export default child;
