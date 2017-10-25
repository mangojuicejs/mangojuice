import { is } from '../utils';
import ensureCommand from './ensureCommand';


/**
 * Returns a hash of a command
 * @param  {function} cmd
 * @return {string}
 */
export function cmdHash(cmd) {
  if (is.func(cmd)) {
    return `${cmd.id}`;
  } else {
    cmd = ensureCommand(cmd);
    return `${cmd.id}${cmd.args.join('.')}`;
  }
}

export default cmdHash
