/**
 * Returns an object which describes compute function
 * and its dependencies to track changes.
 * @param  {...object} deps  list of models with attached logic
 * @return {object}
 */
export function depends(...deps) {
  return {
    computeFn: noop,
    deps: deps,
    compute(func) {
      this.computeFn = func;
      return this;
    }
  };
}

export default depends;
