/**
 * Creates an object which describes child logic which will
 * be attached to some model field.
 * @param  {Class} logic
 * @return {Object}
 */
export function child(logic, ...args) {
  return { logic, args };
}

export default child;
