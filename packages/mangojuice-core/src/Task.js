import { sym, is } from "./Utils";

/**
 * A symbol for setting custom promise cancel function.
 * You can use it to specify some specific logic that
 * should be executed when some task canceled. Like for
 * `delay` function you can clear a timer
 * (see `delay` sources below).
 * @type {string}
 */
export const CANCEL = sym("CANCEL_PROMISE");

/**
 * Clss represents a token for cancelling the task
 * @param {CancellationToken} parentToken
 */
export function CancellationToken(parentToken) {
  if (!(this instanceof CancellationToken)) {
    return new CancellationToken(parentToken);
  }
  const cancellationPromise = new Promise(resolve => {
    this.cancel = e => {
      if (e) {
        resolve(e);
      } else {
        const err = new Error("cancelled");
        err.cancelled = true;
        resolve(err);
      }
    };
  });
  this.register = callback => {
    cancellationPromise.then(callback);
  };
  this.createDependentToken = () => new CancellationToken(this);
  if (parentToken && parentToken instanceof CancellationToken) {
    parentToken.register(this.cancel);
  }
}

/**
 * Helper function that will register a callback function
 * for handling task cancellation.
 * @param  {Function} callback
 * @return {void}
 */
export function registerCancelHandler(callback) {
  this[CANCEL] = callback;
}

/**
 * Creates initial task context for `call` function without
 * any active context.
 * @return {Object}
 */
export function getInitContext() {
  const token = new CancellationToken();
  return {
    cancelRoot: token.cancel,
    onCancel: registerCancelHandler,
    token,
    call
  };
}

/**
 * Creates a Task object that could be returned from
 * async task command.
 * @param  {Function} task
 * @return {Object}
 */
export function create(task) {
  return {
    task,
    success(cmd) {
      this.successCmd = cmd;
      return this;
    },
    fail(cmd) {
      this.failCmd = cmd;
      return this;
    }
  };
}

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
export function call(fn, ...args) {
  const context =
    this && this.token
      ? { ...this, token: this.token.createDependentToken() }
      : getInitContext();

  const res = new Promise((resolve, reject) => {
    try {
      const fnRes = fn.apply(context, args);
      if (is.promise(fnRes)) {
        fnRes.then(resolve, reject);
        context.token.register(e => {
          if (fnRes[CANCEL]) fnRes[CANCEL]();
          if (context[CANCEL]) context[CANCEL]();
          reject(e);
        });
      } else {
        resolve(fnRes);
      }
    } catch (e) {
      reject(e);
    }
  });

  res.cancel = context.token.cancel;
  return res;
}

/**
 * Wait some time. Support cancellation in the `call`.
 * @param  {number}  ms
 * @param  {any} val
 * @return {Promise}
 */
export function delay(ms, val = true) {
  let timeoutId;
  this.onCancel(() => clearTimeout(timeoutId));
  return new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(val), ms);
  });
}
