import callTask from './callTask';
import Task from '../../classes/Task';

/**
 * Creates a Task object that could be returned from
 * async task command.
 * @param  {Function} task
 * @return {Object}
 */
export function task(taskFn) {
  return new Task(taskFn, callTask);
}

export default task;
