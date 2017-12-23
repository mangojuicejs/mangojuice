import { CANCEL } from '../../classes/TaskCall';
import { ZERO_DELAY } from '../../config';


/**
 * Wait some time. Support cancellation in the `call`.
 * @param  {number}  ms
 * @return {Promise}
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
