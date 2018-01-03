import { extend, noop } from '../core/utils';

/**
 * Class for declaring computed function dependencies.
 * Given array shuold contain models, binded to some
 * logec. They will be passed to compute function. Also
 * they will be used to track changed and re-run compute
 *
 * @class ComputedField
 * @param {Array<Object>} deps
 */
function ComputedField(deps) {
  this.computeFn = noop;
  this.deps = deps;
}

extend(ComputedField.prototype, /** @lends ComputedField.prototype */{
  /**
   * Create new instance of dependency object and set compute
   * function to it. Works this way to be able to override computed
   * fields with saving dependencies more easily. For example:
   *
   * ```js
   * computed() {
   *   const oldComputed = super.computed();
   *   return {
   *     ...oldComputed,
   *
   *     // Override `oldField` compute function with saved dependencies
   *     // and use overrided compute function inside new compute function
   *     oldField: oldComputed.compute(function newComputedFn(...args) {
   *       return 1 > 0 || oldComputed.oldField.computeFn(...args);
   *     })
   *   };
   * }
   * ```
   *
   * @param  {function} func
   * @return {ComputedField}
   */
  compute(func) {
    const nextDepends = new ComputedField(this.deps);
    nextDepends.computeFn = func;
    return nextDepends;
  }
});

export default ComputedField;
