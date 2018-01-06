import { sym, is, fastTry, ensureError, extend, noop } from '../core/utils';


/**
 * A symbol for setting custom promise cancel function.
 * You can use it to specify some specific logic that
 * should be executed when some task canceled. Like for
 * `delay` function you can clear a timer
 * (see `delay` sources below).
 * @private
 * @type {string}
 */
export const CANCEL = sym('CANCEL_PROMISE');


/**
 * Main task executor class, which set as a context for a
 * task function. Provides a way to execute a task, cancel
 * the task and wait for all subtasks to be finished.
 *
 * @private
 * @class AsyncTask
 * @param {Object|AsyncTask}   parent
 * @param {Function}          fn
 * @param {Array<any>}        args
 */
function AsyncTask(parent, fn, args) {
  this.execution = null;
  this.parent = parent;
  this.subtasks = [];
  this.cancelResolve = noop;
  this.cancelPromise = new Promise(r => this.cancelResolve = r);
  this.args = args;
  this.fn = fn;
  this.done = false;
  this.cancelled = false;

  if (parent && parent.cancelPromise) {
    parent.cancelPromise.then(this.cancelResolve);
  }
}

extend(AsyncTask.prototype, /** @lends AsyncTask.prototype */{
  /**
   * Execute a task and handle the response. Returns
   * an array which will be executed when the task and all
   * subtasks finished
   * @return {Promise}
   */
  exec() {
    if (this.execution) {
      return this.execution;
    }

    const task = fastTry(() => this.fn.apply(this, this.args));
    if (task.error) {
      this.execution = Promise.resolve(task);
      return this.execution;
    }

    const handleTaskFinish = (result) => {
      if (this.done || this.cancelled) return;

      if (result instanceof Error) {
        if (result.cancelled) {
          this.cancelled = true;
          const runCancelHandlers = () => {
            if (task.result && task.result[CANCEL]) task.result[CANCEL]();
            if (this.cancelHandler) this.cancelHandler();
          };
          const { error } = fastTry(runCancelHandlers);
          const ret = { result: null, error: error || result };
          return result.task === this ? ret : Promise.reject(ret);
        }

        this.cancel();
        return { result: null, error: result };
      }

      if (this.subtasks.length > 0) {
        const resProxy = () => result;
        const subtasksWaitPromise = Promise.all(this.subtasks)
          .then(resProxy, resProxy);
        const finalRace = Promise
          .race([ this.cancelPromise, subtasksWaitPromise ])
          .then(handleTaskFinish, handleTaskFinish);

        this.subtasks = [];
        return finalRace;
      }

      this.done = true;
      return { result, error: null };
    };

    this.execution = Promise
      .race([ this.cancelPromise, task.result ])
      .then(handleTaskFinish, handleTaskFinish);

    return this.execution;
  },

  /**
   * Call some subtask. The parrent task will be finished only
   * when all children tasks will be resolved
   * @param  {Function}  fn
   * @param  {...any} args
   * @return {Promise}
   */
  call(fn, ...args) {
    const task = new AsyncTask(this, fn, args);
    const execPromise = task.exec()
    this.subtasks.push(execPromise);
    execPromise.task = task;
    return execPromise;
  },

  /**
   * Cancel this task and all children subtasks
   */
  cancel() {
    const err = new Error('Cancelled');
    err.cancelled = true;
    err.task = this;
    this.cancelResolve(err);
  },

  /**
   * Set a handler which will be executed when task cancelled
   * @param  {Function} handler
   */
  onCancel(handler) {
    this.cancelHandler = handler;
  },

  /**
   * Run `notify` function of parent object/task with provided
   * arguments if defined.
   * @param  {...any} args
   */
  notify(...args) {
    if (this.parent && this.parent.notify) {
      return this.parent.notify(...args);
    }
  }
});

export default AsyncTask;
