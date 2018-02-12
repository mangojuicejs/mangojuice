import { delayedExec } from './debounce';


function throttle(opts, func) {
  return delayedExec('throttle', func, opts);
}

export default throttle;
