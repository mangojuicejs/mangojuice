import { extend, noop } from '../core/utils';

/**
 * Describes child logic which will be attached to some model field.
 * Created by {@link child} function. Should be used in {@link LogicBase#children} to
 * define a logic that should be instantiated with some arguments passed
 * to {@link LogicBase#config} and {@link LogicBase#children}.
 *
 * @example
 * class ChildLogic {
 *   config(amount) {
 *     return { meta: { amount } };
 *   }
 * }
 * class RootLogic {
 *   children() {
 *     return {
 *       modelField: child(ChildLogic, 10)
 *       // `config` of `ChildLogic` will be invoked with
 *       // `10` as a first argument
 *     }
 *   }
 * }
 * @class ChildLogic
 * @property {LogicBase} logicClass  A Logic class you want to attach to the model
 * @property {Array<any>} args  A list of arguments that should be passed to `config` and
 *                              `children` methods of the logic.
 * @param {Array<Object>} logicClass
 * @param {Array<Object>} args
 */
function ChildLogic(logicClass, args) {
  this.logicClass = logicClass;
  this.args = args;
}

extend(ChildLogic.prototype, /** @lends ChildLogic.prototype */{
  /**
   * Creates a new instance of the child declaration and set shared model
   * which will be available in the logic. It overrides the shared model used
   * in current logic instance.
   *
   * @example
   * class MyLogic {
   *   children() {
   *     return {
   *       // An instance of `ChildBlock.Logic` will be attached to
   *       // `childModel` field of the model and `this.shared` in the
   *       // instance will be equal to `{ a: 1 }`
   *       childModel: child(ChildBlock.Logic).shared({ a: 1 })
   *     }
   *   }
   * }
   * @param  {Function} func  A compute function that should return a value that
   *                          will be used as a value for some computed field in
   *                          a model. This function will be invoked with all
   *                          dependency models as arguments
   * @return {ComputedField}  New instance of the ComputedField with `computeFn`
   *                          set to given function.
   */
  shared(sharedModel) {
    const nextChild = new ChildLogic(this.logicClass, this.args);
    nextChild.sharedModel = sharedModel;
    return nextChild;
  }
});

export default ChildLogic;
