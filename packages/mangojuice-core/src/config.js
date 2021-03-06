export let ZERO_DELAY = false;


/**
 * Set all delays in the mangojuice to zero. It means, that:
 * - any `delay(...)` will be resolved right at the end of call stack
 * - eny cmd debounce/throttle will be executed right at the end of a call stack
 *
 * @private
 * @param  {bool} val
 */
export const setZeroDelay = (val) => ZERO_DELAY = !!val;
