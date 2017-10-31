import { extend } from '../core/utils';
import ensureCommand from '../core/cmd/ensureCommand';


/**
 * Class for declaring an async task.
 * @param {function} taskFn
 * @param {function} executor
 */
export function Task(taskFn, executor) {
  this.task = taskFn;
  this.executor = executor;
}

extend(Task.prototype, {
  /**
   * Set a success handler command. Will be executed
   * with return value from the task function on success
   * @param  {Command} cmd
   * @return {Task}
   */
  success(cmd) {
    this.successCmd = ensureCommand(cmd);
    return this;
  },

  /**
   * Set a fail handler command. Will be executed if task
   * will exit with exception. The exception will be passed
   * to the fail command as first argument.
   * @param  {Command} cmd
   * @return {Task}
   */
  fail(cmd) {
    this.failCmd = ensureCommand(cmd);
    return this;
  },

  /**
   * Define the task to be "multi-thread", so every call
   * will run in parallel with other calls of the same task
   * in scope of one process (model).
   * @param  {boolean} val
   * @return {Task}
   */
  multithread(val) {
    this.execEvery = val;
    return this;
  },

  /**
   * Set task executor funtion. The executor will be used
   * to execute a task function. It should return a promise
   * which will be resolved or rejected with an object
   * `{ result, error }` also returned promise should have
   * a function `cancel` to be able to cancel the execution.
   * @param  {function} engine
   * @return {Task}
   */
  engine(engine) {
    this.executor = engine;
    return this;
  },

  /**
   * Set excat arguments which will be passed to the task
   * starting from second argument. By default a task will receive
   * the same set of arguments as a task command.
   * @param  {...any} args
   * @return {Task}
   */
  args(...args) {
    this.customArgs = args;
    return this;
  }
});

export default Task;
