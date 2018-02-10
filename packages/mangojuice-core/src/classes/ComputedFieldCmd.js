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
function ComputedFieldCmd(deps) {
  this.computeFn = noop;
  this.deps = deps;
}

extend(ComputedFieldCmd.prototype, /** @lends ComputedField.prototype */{
  compute(func) {
    this.computeFn = func;
    return this;
  }
});

export default ComputedFieldCmd;
