import ChildLogic from '../../classes/ChildLogic';


/**
 * Creates an object which describes child logic which will be attached
 * to some model field. Should be used in {@link LogicBase#children} to
 * define a logic that should be instantiated with some arguments passed
 * to {@link LogicBase#config}.
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
 * @param  {LogicBase} logicClass  Class that imlements {@link LogicBase} interface
 * @return {Object} Object that contains a logic class and an arguments array that
 *                  should be used to invoke `config` method of provided logic class.
 */
export function child(logicClass, ...args) {
  return new ChildLogic(logicClass, args);
}

export default child;
