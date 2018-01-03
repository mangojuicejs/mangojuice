import callTask from './callTask';
import TaskMeta from '../../classes/TaskMeta';


/**
 * Creates a TaskMeta object that could be returned from
 * async task command. It describes the task to be executed.
 * @param  {Function} task
 * @return {Object}
 */
export function task(taskFn) {
  return new TaskMeta(taskFn, callTask);
}

export default task;
