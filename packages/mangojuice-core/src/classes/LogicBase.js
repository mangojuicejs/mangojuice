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
 * - A set of rules to handle commands from children logic – {@link LogicBase#hub} methods
 * - A logic to handle external events – {@link LogicBase#port} method.
 *
 * So, it defines all business-logic of some part of your application.
 * But the main goal of the logic – change associated model. Check {@link cmd} and {@link Process#exec}
 * to have a better understanding how command can be defined and how it is executed.
 *
 * @class  LogicBase
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
   * A function that defines init commands and meta object of the
   * logic. Can accept any type and number of arguments. Config
   * will take arguments passed to {@link child} function (for example
   * `child(MyLogic, 1, 2, 3)` defines that the `config` method of
   * `MyLogic` will be invoked like `config(1, 2, 3)`)
   *
   * Could return an object with the fields:
   * - `initCommands` which could be an array or a single Command,
   *   that will be executed every time when the logic instance created
   *   and associated with some model
   * - `meta` which could be an object with some internal state of
   *   the logic
   *
   * @example
   * config(props) {
   *   return {
   *     initCommands: [ this.StartThis, this.SendThat(123) ],
   *     meta: { something: props.amount }
   *   };
   * }
   * @return {{ initCommands?: Command|Array<Command>, meta?: Object }}
   */
  config() {},

  /**
   * This function defines what logic class should be associated
   * with which model field. Should return an object where a key is
   * a model field name, and a value is a logic class or an object
   * that defines logic with arguments (return from {@link child} function)
   *
   * @example
   * children() {
   *   return {
   *     searchForm: child(SearchForm.Logic, { timeout: 100 }),
   *     searchResults: SearchResults.Logic
   *   };
   * }
   * @return {Object}
   */
  children() {},

  /**
   * Should return an object which defines computed fields of the model.
   * A key of the object is a model field, and value is a function or
   * computed function definition object (return from {@link depends} function).
   *
   * Computed field is lazy, which means that it is computed on the first use
   * of the field and the computation result cached until the next update
   * of the model.
   *
   * If you want to define a computed field which ueses in computation not
   * only fields from the own model, but maybe some values from child model,
   * or from shared model, then you will need to use {@link depends} function to
   * define what models used while computation to observe changes of these
   * models to trigger an update event of the own model (to update views).
   *
   * @example
   * computed() {
   *   return {
   *     simple: () => this.model.a + this.model.b,
   *     withDeps: depends(this.model.child, this.shared).compute(() => {
   *       return this.model.child.a + this.shared.b + this.model.c;
   *     })
   *   };
   * }
   * @return {Object}
   */
  computed() {},

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

  /**
   * Hub for all commands executed in the children blocks. The only
   * arguments is a command object that was executed.
   * Could return a Command or an array of Commands that should
   * be executed next.
   * Most of the time this function will look like a `switch`,
   * but maybe with some additional rules for the cases. Take a look
   * to {@link Command#is} function to have a better understanding how you
   * can determine that the command is exactly what you are waiting for.
   *
   * @example
   * hubAfter(cmd) {
   *   if (cmd.is(ChildBlock.Logic.prototype.SomeCommand)) {
   *     return this.HandlerCommand(123);
   *   }
   *   if (cmd.is('AnotherChild.SomeAnothercommand')) {
   *     return [ this.HandlerCommand(321), this.AnotherHandler ];
   *   }
   * }
   * @param  {Command} cmd  Command that was executed in some child logic
   *                        or in any child of the child and so on down to
   *                        the leaf of the tree.
   * @return {?Command|?Array<Command>}
   */
  hubAfter(cmd) {},

  /**
   * Same as {@link LogicBase#hubAfter}, but catch commands before
   * it will be actually executed, so you can compare prev and next
   * model state for example.
   * @param  {Command} cmd
   * @return {?Command|?Array<Command>}
   */
  hubBefore(cmd) {}
});

export default LogicBase;
