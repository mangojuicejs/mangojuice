import { CANCEL } from '../../classes/TaskCall';


// Constants
let DELAY_LIMIT = Infinity;

/**
 * Wait some time. Support cancellation in the `call`.
 * @param  {number}  ms
 * @return {Promise}
 */
export function delay(ms) {
  const actualMs = ms > DELAY_LIMIT ? DELAY_LIMIT : ms;
  let timeoutId;
  const res = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(), actualMs);
  });
  res[CANCEL] = () => clearTimeout(timeoutId);
  return res;
}

/**
 * Set upper delay limit so any delay will take no longer
 * than given amount of milliseconds. Useful for testing
 * and server rendering.
 * @param  {number} ms
 */
delay.setLimit = (ms) => {
  DELAY_LIMIT = ms;
};

export default delay;
