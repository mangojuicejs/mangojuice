import Command from '../../classes/Command';
import procOf from '../logic/procOf';
import ensureCommand from './ensureCommand';


/**
 * Cancel task with given id in the process if exists
 * and can be cancelled (have `cancel` function defined)
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
 * Cancel all executing tasks of the process
 *
 * @private
 * @param  {Process} proc
 */
export function cancelAllTasks(proc) {
  for (const taskId in proc.tasks) {
    cancelTask(proc, taskId);
  }
}


/**
 * This function should be used to cancel async {@link task} execution.
 * Also it can cancel the debounced/throttled command.
 * - In case with task, if task was executing while you call a cancel command,
 *   the task will be cancelled (execution stopped). Otherwise nothing will happen.
 * - In case with debounced/throttled command, if the command scheduled to be executed
 *   then the schedule timer will be cleared and the command won't be executed.
 *   If the command is not scheduled then nothing happens.
 *
 * To use it just pass a command or command factory as a first argument
 * and return it from some other command.
 *
 * @example
 * class SomeLogic {
 *   \@cmd CancelSomethingCommand() {
 *     return [
 *       cancel(this.TaskCommand),
 *       cancel(this.DebounceCommand)
 *     ];
 *   }
 *   \@cmd TaskCommand() {
 *     return task(Tasks.SomeTask);
 *   }
 *   \@cmd({ debounce: 300 })
 *   DebounceCommand() {
 *     // do something
 *   }
 * }
 * @param  {Command|function} cmd  Command or command factory that you wan to cancel. Could
 *                                 be a command that returns {@link task} or debounced/throttled
 *                                 command
 * @return {Command} Returns a new command that will cancel the execution of the command
 *                   passed as an argument.
 */
function cancel(cmd) {
  const realCmd = ensureCommand(cmd);
  const cancelFn = function() {
    const proc = procOf(this.model);
    cancelTask(proc, realCmd.id);
  };
  const cmdName = `${realCmd.funcName}.Cancel`;
  const cancelCmd = new Command(cancelFn, null, cmdName, { internal: true });
  return cancelCmd.bind(realCmd.logic);
}

export default cancel;
