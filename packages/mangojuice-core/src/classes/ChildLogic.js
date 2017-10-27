import { extend } from '../core/utils';
import ensureCommand from '../core/cmd/ensureCommand';


/**
 * Class for declaring child logic
 * @param {Class} logic
 * @param {Array<any>} args
 */
function ChildLogic(logic, args) {
  this.logic = logic;
  this.configArgs = args;
}

extend(ChildLogic.prototype, {
  /**
   * Alias for `beforeHandler`
   * @param  {Command} handler
   * @return {ChildLogic}
   */
  handler(handler) {
    return this.beforeHandler(handler);
  },

  /**
   * Set a command which will catch all commands from
   * child logic (down to the leaf) before the command execute
   * @param  {Command} handler
   * @return {ChildLogic}
   */
  beforeHandler(handler) {
    this.beforeCmd = ensureCommand(handler);
    return this;
  },

  /**
   * Set a command which will catch all commands from
   * child logic (down to the leaf) after the command execute
   * @param  {Command} handler
   * @return {ChildLogic}
   */
  afterHandler(handler) {
    this.afterCmd = ensureCommand(handler);
    return this;
  }
});

export default ChildLogic;
