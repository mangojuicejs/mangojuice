import Command from '../../classes/Command';
import { is } from '../utils';


/**
 * Returns a Command instance or throw an error if given
 * arguments can't be used to create a Command.
 * Accept a command factory and regular function.
 * @param  {function}    cmd
 * @param  {...any} args
 * @return {Command}
 */
export function ensureCommand(cmd, ...args) => {
  if (!cmd) return null;
  if (!cmd.isCmd) {
    if (is.func(cmd)) {
      if (cmd.func) {
        return cmd(...args);
      } else {
        return new Command(cmd, args, cmd.name);
      }
    }
    throw new Error("You passed something weird instead of cmd");
  }
  return cmd;
};
