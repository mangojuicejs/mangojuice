import { sym, is, fastTry, ensureError, extend, noop } from '../utils';


/**
 * A symbol for setting custom promise cancel function.
 * You can use it to specify some specific logic that
 * should be executed when some task canceled. Like for
 * `delay` function you can clear a timer
 * (see `delay` sources below).
 * @type {string}
 */
export const CANCEL = sym('CANCEL_PROMISE');


/**
 * Main task executor class, which set as a context for a
 * task function. Provides a way to execute a task, cancel
 * the task and wait for all subtasks to be finished.
 * @param {Object|TaskCall}   parent
 * @param {Function}          fn
 * @param {Array<any>}        args
 */
function TaskCall(parent, fn, args) {
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

extend(TaskCall.prototype, {
  /**
   * Execute a task and handle the response. Returns
   * an array which will be executed when the task and all
   * subtasks finished
   * @return {Promise}
   */
  exec() {
    const task = fastTry(() => this.fn.apply(this, this.args));
    if (task.error) {
      return Promise.resolve(task);
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

    return Promise
      .race([ this.cancelPromise, task.result ])
      .then(handleTaskFinish, handleTaskFinish);
  },

  /**
   * Call some subtask. The parrent task will be finished only
   * when all children tasks will be resolved
   * @param  {Function}  fn
   * @param  {...any} args
   * @return {Promise}
   */
  call(fn, ...args) {
    const task = new TaskCall(this, fn, args);
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

/**
 * Call some async function with arguments and returns
 * a Promise with `cancel` function. In context (in `this`)
 * of the function will be availble new function `call`,
 * that should be used to invoke other async functions.
 * It is needed to make possible to cancel the task at points
 * where `call` is used.
 *
 * If you will call `cancel` function execution of the
 * function will be stopped at point of some `call` execution.
 * @param  {Function}  fn
 * @return {Promise}
 */
function call(fn, ...args) {
  return new TaskCall(this, fn, args);
}

export const callTask = call;
export default callTask;
