import { CANCEL } from '../classes/AsyncTask';
import { ZERO_DELAY } from '../config';


/**
 * A helper function for delaying execution. Returns a Promise
 * which will be resolved in given amount of milliseconds. You can
 * use it in {@link task} to implement some delay in execution, for
 * debouncing for example.
 *
 * @param  {number}  ms  An amount of milliseconds to wait
 * @return {Promise} A promise that resolved after given amount of milliseconds
 */
export function delay(ms) {
  const actualMs = ZERO_DELAY ? 0 : ms;
  let timeoutId;
  const res = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(), actualMs);
  });
  res[CANCEL] = () => clearTimeout(timeoutId);
  return res;
}

export default delay;
