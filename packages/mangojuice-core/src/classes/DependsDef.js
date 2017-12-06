import { extend, noop } from '../core/utils';

/**
 * Class for declaring computed function dependencies.
 * Given array shuold contain models, binded to some
 * logec. They will be passed to compute function. Also
 * they will be used to track changed and re-run compute
 * @param {Array<Object>} deps
 */
function DependsDef(deps) {
  this.computeFn = noop;
  this.deps = deps;
}

extend(DependsDef.prototype, {
  /**
   * Set computed funtion to be used for computing the field
   * on every self model update or on every dependencies model
   * updated. It will get given in construction dependencies
   * models as arguments.
   * @param  {function} func
   * @return {DependsDef}
   */
  compute(func) {
    const nextDepends = new DependsDef(this.deps);
    nextDepends.computeFn = func;
    return nextDepends;
  }
});

export default DependsDef;
