import { is } from './utils';
import task from './task';
import ThrottleTask from '../classes/ThrottleTask';


const DELAY_EXEC_ID = 'DELAYED';

function delayedExecTaskEngine(opts, context, taskObj, logic) {
  return new ThrottleTask(context.notify, opts);
}

export function delayedExec(type, func, rawOpts) {
  const opts = is.object(rawOpts) ? rawOpts : { [type]: rawOpts };
  if (!opts[type]) {
    opts[type] = opts.wait || 0;
  }

  const delayedTask = task(func)
    .engine(delayedExecTaskEngine.bind(null, opts))
    .execId(DELAY_EXEC_ID)
    .notify(func);
}

function debounce(opts, func) {
  return delayedExec('debounce', func, opts);
}

export default debounce;
