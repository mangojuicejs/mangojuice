// Internals
let currContext = null;

/**
 * Set current context in the module
 * @param  {Object} nextContext
 */
export const setContext = nextContext => {
  currContext = nextContext
};

/**
 * Returns currenctly active context object
 * @return {Object}
 */
export const getContext = () => {
  return currContext;
};

/**
 * Run given function with given arguments with setting
 * given context globally (in the module)
 * @param  {Object} context
 * @param  {Function} func
 * @param  {Arra<any>} args
 * @return {any}
 */
export function runInContext(context, func, args) {
  const oldContext = getContext();
  setContext(context);
  try {
    return func.apply(this, args);
  } finally {
    setContext(oldContext);
  }
}
