import Command from '../../classes/Command';
import procOf from '../logic/procOf';
import ensureCommand from './ensureCommand';


/**
 * Cancel task with given id in the process if exists
 *
 * @private
 * @param  {Process} proc
 * @param  {nubmer} id
 */
export function cancelTask(proc, taskId) {
  const taskProcs = proc.tasks[taskId];
  delete proc.tasks[taskId];

  for (const execId in taskProcs) {
    const taskCall = taskProcs[execId];
    if (taskCall && taskCall.cancel) {
      taskCall.cancel();
    }
  }
}

/**
 * Provides a way to cancel task execution. By given command
 * (that returns a task object) returns a command which will
 * cancel any executing task associated with given command.
 * @param  {Command|function} cmd
 * @return {Command}
 */
function cancel(cmd) {
  const realCmd = ensureCommand(cmd);
  const cancelFn = function() {
    const proc = procOf(this.model);
    cancelTask(proc, realCmd.id);
  };
  const cancelCmd = new Command(
    cancelFn,
    null,
    `${realCmd.funcName}.Cancel`,
    true
  );
  return cancelCmd.bind(realCmd.logic);
}

export default cancel;
