import callTask from './callTask';
import TaskMeta from '../../classes/TaskMeta';
import { CANCEL } from '../../classes/AsyncTask';


/**
 * Creates a {@link TaskMeta} object that could be returned from
 * async task command. It describes the task that should be executed.
 *
 * For more information what the **Task** is and how it should be implemented
 * take a look to {@link TaskMeta}.
 *
 * @property {string} CANCEL  A symbol that you can use to make a promise "cancellable"
 * @param  {Function} taskFn  A function that could return a Promise
 * @return {Object}
 */
export function task(taskFn) {
  return new TaskMeta(taskFn, callTask);
}

// Export CANCEL symbol to be able to make cancellable promises
task.CANCEL = CANCEL;

export default task;
