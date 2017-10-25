import { sym, is, fastTry, ensureError } from "./utils";


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
function CancellationToken(parentToken) {
  if (!(this instanceof CancellationToken)) {
    return new CancellationToken(parentToken);
  }
  const cancellationPromise = new Promise(resolve => {
    this.cancel = () => {
      const err = new Error("Cancelled");
      err.cancelled = true;
      resolve(err);
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
function registerCancelHandler(callback) {
  this[CANCEL] = callback;
}

/**
 * Creates initial task context for `call` function without
 * any active context.
 * @return {Object}
 */
function getInitContext(initContext) {
  const token = new CancellationToken();
  return {
    ...initContext,
    cancelTask: token.cancel,
    onCancel: registerCancelHandler,
    subtasks: [],
    token,
    call
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
function call(fn, ...args) {
  const parentSubtasks = this && this.subtasks || [];
  const context =
    this && this.token
      ? { ...this, subtasks: [], token: this.token.createDependentToken() }
      : getInitContext(this);
  context.call = context.call.bind(context);

  const res = new Promise((resolve, reject) => {
    // Run func and check for sync code errors
    const execRes = fastTry(() => fn.apply(context, args));
    if (execRes.error) {
      return resolve(execRes);
    }

    // Normalize response to be always a promise
    if (!is.promise(execRes.result)) {
      execRes.result = Promise.resolve(execRes.result);
    }

    // Register for token cancellations
    context.token.register(cancelError => {
      if (res.done) return;
      const { error } = fastTry(() => {
        if (execRes.result[CANCEL]) execRes.result[CANCEL]();
        if (context[CANCEL]) context[CANCEL]();
      });
      res.cancelled = true;
      reject({ result: null, error: error || cancelError });
    });
    execRes.result.then(
      result => {
        const successHandler = () => {
          res.done = true;
          resolve({ result, error: null });
        };
        return Promise.all(context.subtasks).then(successHandler, successHandler);
      },
      error => resolve({ result: null, error: ensureError(error) })
    );
  });

  parentSubtasks.push(res);
  res.cancel = context.token.cancel;
  return res;
}

export const callTask = call;
export default callTask;
