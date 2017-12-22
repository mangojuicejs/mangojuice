import Command from '../../classes/Command';
import { is } from '../utils';

/**
 * Returns a Command instance or throw an error if given
 * arguments can't be used to create a Command.
 * Accept a command factory and regular function.
 * @param  {function}  cmd
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
