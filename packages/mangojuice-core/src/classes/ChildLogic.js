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
});

export default ChildLogic;
