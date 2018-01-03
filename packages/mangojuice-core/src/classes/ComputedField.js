import { extend, noop } from '../core/utils';

/**
 * Class for declaring computed field with model dependencies.
 * Given array shuold contain models, binded to some
 * logec. They will be passed to compute function in the same order.
 * Also they will be used to track changed and re-compute.
 *
 * The class is immutable, so any call to any method will create
 * a new instance of `ComputedField` and the old one won't be touched.
 *
 * @class ComputedField
 * @property {Array<Object>} deps  An array of models with binded logic
 *                                 (attached some {@link Process})
 * @property {Function} computeFn  A compute function that will be used
 *                                 to compute value of the computed field.
 * @param {Array<Object>} deps
 */
function ComputedField(deps) {
  this.computeFn = noop;
  this.deps = deps;
}

extend(ComputedField.prototype, /** @lends ComputedField.prototype */{
  /**
   * Creates a new instance of the field and set compute function in it.
   *
   * @example
   * // A way to override computed field of some base logic class
   * // (thanks to immutability of `ComputedField`)
   * class MyLogic extends SomeOtherLogic {
   *   computed() {
   *     const oldComputed = super.computed();
   *     return {
   *       ...oldComputed,
   *
   *       // Override `oldField` compute function with saved dependencies
   *       // and use overrided compute function inside new compute function
   *       oldField: oldComputed.compute((...deps) => {
   *         return 1 > 0 || oldComputed.oldField.computeFn(...deps);
   *       })
   *     };
   *   }
   * }
   * @param  {Function} func  A compute function that should return a value that
   *                          will be used as a value for some computed field in
   *                          a model. This function will be invoked with all
   *                          dependency models as arguments
   * @return {ComputedField}  New instance of the ComputedField with `computeFn`
   *                          set to given function.
   */
  compute(func) {
    const nextDepends = new ComputedField(this.deps);
    nextDepends.computeFn = func;
    return nextDepends;
  }
});

export default ComputedField;
