import { extend, noop } from '../core/utils';
import Message from './Message';


/**
 * Describes child logic which will be attached to some model field.
 * Created by {@link child} function. Should be used in {@link LogicBase#children} to
 * define a logic that should be instantiated with some arguments passed
 * to {@link LogicBase#config} and {@link LogicBase#children}.
 *
 * @example
 * class MetaChild {
 *   config(amount) {
 *     return { meta: { amount } };
 *   }
 * }
 * class RootLogic {
 *   children() {
 *     return {
 *       modelField: child(MetaChild, 10)
 *       // `config` of `MetaChild` will be invoked with
 *       // `10` as a first argument
 *     }
 *   }
 * }
 * @class MetaChild
 * @property {LogicBase} logicClass  A Logic class you want to attach to the model
 * @property {Array<any>} args  A list of arguments that should be passed to `config` and
 *                              `children` methods of the logic.
 * @param {Array<Object>} logicClass
 * @param {Array<Object>} args
 */
function ChildCmd(logicClass) {
  this.logicClass = logicClass;
}

extend(ChildCmd.prototype, /** @lends ChildCmd.prototype */{
  update(msg) {
    if (!msg || !(msg instanceof Message)) {
      throw new Error('You can only use Message instance to update a child model');
    }
    this.updateMsg = msg;
    return this;
  }

  create(...args) {
    this.createArgs = args;
    return this;
  }
});

export default ChildCmd;
