import AsyncTask from '../../classes/AsyncTask';


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
  return new AsyncTask(this, fn, args);
}

export default call;
