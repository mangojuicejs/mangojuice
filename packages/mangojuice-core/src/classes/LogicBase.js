import { extend, is } from '../core/utils';


/**
 * Basic class for every logic. It is not necessaty to inherit an actual logic
 * class from it, but for better type-checking it could be really usefull.
 *
 * Logic class defines:
 * - A set of commands that could change an associated model – methods decorated with {@link cmd}
 * - What fields of the model should be associated with which logic class
 *   (children blocks) – {@link LogicBase#children} method
 * - A set of computed model fields – {@link LogicBase#computed} method
 * - A set of rules to handle commands from children logic – {@link LogicBase#hubAfter}
 *   and {@link LogicBase#hubBefore} methods
 * - A logic to handle external events – {@link LogicBase#port} method.
 *
 * The logic class defines all the business-logic of some part of your application.
 * The main goal of the logic – change associated model. Check {@link cmd} and {@link Process#exec}
 * to have a better understanding how command can be defined and how it is executed.
 *
 * @class  LogicBase
 * @example
 * // ./blocks/MyBlock/Logic.js
 * // @flow
 * import type { Model } from './Model';
 * import ChildBlock from '../ChildBlock';
 * import { Command, cmd } from 'mangojuice-core';
 *
 * export default class MyLogic extends LogicBase<Model> {
 *   children() {
 *     return { child: ChildBlock.Logic };
 *   }
 *   hubAfter(cmd: Command) {
 *     if (cmd.is(ChildBlock.Logic.prototype.SomeCommand)) {
 *       return this.TestCommand(123);
 *     }
 *   }
 *   \@cmd TestCommand(arg) {
 *     return { field: arg + this.model.field };
 *   }
 * }
 * @property {Object} model   A model object which is associated with the
 *                            logic class in parent logic.
 * @property {Object} meta    An object defined in {@link LogicBase#config} method for storing
 *                            some internal logic state.
 * @property {Object} shared  An object with some shared state, defined while
 *                            run process of the app.
 */
function LogicBase() {
}


extend(LogicBase.prototype, /** @lends LogicBase.prototype */{
  /**
   * A function to handle global event, such as browser-level events,
   * websocket, intervals. The main porpouse of the `port` is to subscribe
   * to some global events, execute appropriate commands from the logic
   * on the events and remove the handlers when the logic was destroyed.
   *
   * @example
   * port(exec, destroyed) {
   *   const timer = setInterval(() => {
   *     exec(this.SecondPassed);
   *   }, 1000);
   *   destroyed.then(() => clearInterval(timer));
   * }
   * @param  {Function} exec      It is a function that execute a passed command
   * @param  {Promise} destroyed  A promise that will be resolved when the logic destroyed
   */
  port(exec, destroyed) {},

  prepare() {},

  hub() {}
});

export default LogicBase;
