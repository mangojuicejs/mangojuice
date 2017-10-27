import { CANCEL } from './callTask';


/**
 * Wait some time. Support cancellation in the `call`.
 * @param  {number}  ms
 * @param  {any} val
 * @return {Promise}
 */
export function delay(ms, val = true) {
  let timeoutId;
  const res = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve(val), ms);
  });
  res[CANCEL] = () => clearTimeout(timeoutId);
  return res;
}

export default delay;
