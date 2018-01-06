import { extend, is } from '../core/utils';
import ensureCommand from '../core/cmd/ensureCommand';


/**
 * Class for declaring an async task. An instance of this object returned
 * from {@link taks} function.
 *
 * A task function is a function that could return a Promise. The resolved value
 * will be passed to a success command handler, the rejected command will be passed
 * to a fail command handler.
 *
 * If task function do not return a Promise, then the returned value passed to a
 * success command, and if the function throw an error then the error passed to
 * a fail command.
 *
 * The task function receive at least one argument – an object with `model`, `shared`
 * and `meta`. All the next arguments will be given from a command that returned a task,
 * if it is not overrided by {@link TaskMeta#args}
 *
 * By default a task is single-threaded. It means that every call to a task will cancel
 * previously running task if it is running. You can make the task to be multi-threaded
 * by {@link TaskMeta#multithread}, so every call to a task won't cancel the running one.
 *
 * In a context of the task function defined special `call` function. This function should
 * be used to invoke sub-tasks. It is important to use `call` to run sub-tasks because
 * `call` create a cancellation point of the task – if the task cancelled, then nothing
 * will be executed after currently running `call` sub-task.
 *
 * `call` returns an object with `result` and `error` fields. If `error` field is not
 * empty, then something weird happened in the sub-task. `call` internally have a try/catch,
 * so it is not necessary to wrap it with try/catch, just check the `error` field in the
 * returned object and if it is not empty – handle it somehow (throw it, or do any custom
 * error handling)
 *
 * Also in a context of the task defined a `notify` function. It is a function that execute
 * notify command if it is defined. The command executed with the same arguments as passed
 * to `notify` function. You can use it to incrementally update a model while the long
 * task is executing, to show some progress for the user.
 *
 * @example
 * async function SubTask(a, b, c) {
 *   this.notify(a + b + c);
 *   await this.call(delay, 100);
 *   return (a / b * c);
 * }
 * async function RootTask({ model }) {
 *   const { result, error } = await this.call(SubTask, 1, 0, 3);
 *   if (error) {
 *     throw new Error('Something weird happened in subtask')
 *   }
 *   return result + 10;
 * }
 * @example
 * class MyLogic {
 *   \@cmd AsyncCommand() {
 *     return task(Tasks.RootTask)
 *       .success(this.SuccessCommand)
 *       .fail(this.FailCommand)
 *       .notify(this.NotifyCommand)
 *   }
 * }
 * @class TaskMeta
 * @param {function} taskFn
 * @param {function} executor
 */
export function TaskMeta(taskFn, executor) {
  this.task = taskFn;
  this.executor = executor;
}

extend(TaskMeta.prototype, /** @lends TaskMeta.prototype */{
  /**
   * Set a notify handler command. This command executed by call of `this.notify`
   * inside a task with the same arguments as passed to `this.notify`
   * @param  {Command} cmd
   * @return {TaskMeta}
   */
  notify(cmd) {
    this.notifyCmd = ensureCommand(cmd);
    return this;
  },

  /**
   * Set a success handler command. Will be executed with a value returned
   * from the task, or if the task returned a Promise – with resovled value.
   * @param  {Command} cmd
   * @return {TaskMeta}
   */
  success(cmd) {
    this.successCmd = ensureCommand(cmd);
    return this;
  },

  /**
   * Set a fail handler command. Will be executed with error throwed in the task,
   * or if the task returned a Promise – with rejected value.
   * @param  {Command} cmd
   * @return {TaskMeta}
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
   * @return {TaskMeta}
   */
  multithread(val) {
    this.execEvery = is.undef(val) ? true : val;
    return this;
  },

  /**
   * Set task executor function. The executor function should return an object
   * that should have at least two fields: `exec` and `cancel` functions.
   * `exec` should return a promise which should be resolved or rejected
   * with an object `{ result, error }`. A `cancel` function should stop
   * the task execution.
   *
   * @param  {Function} engine  A function that returns
   *                            `{ exec: Function, cancel: Function }` object
   * @return {TaskMeta}
   */
  engine(engine) {
    this.executor = engine;
    return this;
  },

  /**
   * Override arguments which will be passed to the task
   * starting from second argument. By default a task will receive
   * the same set of arguments as a task command. If this function invoked,
   * then the task will receive given arguments instead of command arguments.
   * @param  {...any} args
   * @return {TaskMeta}
   */
  args(...args) {
    this.customArgs = args;
    return this;
  }
});

export default TaskMeta;
