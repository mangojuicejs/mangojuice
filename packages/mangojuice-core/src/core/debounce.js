import { is } from './utils';
import task from './task';
import DebounceTask from '../classes/DebounceTask';


const DELAY_EXEC_ID = 'DELAYED';

function delayedExecTaskEngine(notifyFn, taskObj) {
  return new DebounceTask(notifyFn, taskObj.metaObj);
}

function debounce(wait, func, options) {
  return task(func)
    .notify(func)
    .multithread()
    .engine(delayedExecTaskEngine)
    .execId(DELAY_EXEC_ID)
    .meta({ wait, options });
}

export default debounce;
