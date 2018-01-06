import Command from '../../classes/Command';
import { is } from '../utils';

/**
 * Returns a {@link Command} instance or throw an error if given
 * argument can't be used to create a {@link Command} (is not a Command
 * or command factory).
 *
 * @example
 * class MyLogic() {
 *   \@cmd SomeCommand() {
 *     // do something
 *   }
 * }
 *
 * const logic = new MyLogic();
 * ensureCommand(logic.SomeCommand) // returns Command instance
 * // equals to...
 * logic.SomeCommand()
 * @param  {Command|function}  cmd  {@link Command} instance or command factory. When
 *                                  command factory then it will be invoked with
 *                                  no arguments to create a command
 * @return {Command}
 */
function ensureCommand(cmd) {
  if (!cmd) return null;
  if (cmd instanceof Command) return cmd;
  if (is.func(cmd)) {
    if (cmd.func) {
      return cmd();
    } else {
      return new Command(cmd, [], cmd.name);
    }
  }
  throw new Error('You passed something weird instead of cmd');
}

export default ensureCommand;
