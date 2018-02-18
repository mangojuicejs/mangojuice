import TaskCmd from '../classes/TaskCmd';
import { CANCEL } from './utils';


function defaultTaskEngine(notifyFn) {
  return new AsyncTask(notifyFn);
}

/**
 * Creates a {@link TaskCmd} object that could be returned from
 * async task command. It describes the task that should be executed.
 *
 * For more information what the **Task** is and how it should be implemented
 * take a look to {@link TaskCmd}.
 *
 * @property {string} CANCEL  A symbol that you can use to make a promise "cancellable"
 * @param  {Function} taskFn  A function that could return a Promise
 * @return {Object}
 */
export function task(taskFn) {
  return new TaskCmd(taskFn, defaultTaskEngine);
}

// Export CANCEL symbol to be able to make cancellable promises
task.CANCEL = CANCEL;

export default task;
