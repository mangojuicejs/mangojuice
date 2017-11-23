import throttle from './throttle';

/**
 * Debounce execution of some command. Works as following:
 * 1. First call execute decorated command instantly
 * 2. Every next call in given N ms will refresh the timer
 * 3. So if after first call you call the command in N ms
 *    then the decorated command will be called
 *    exaclt in next N ms
 * @param  {number} ms
 * @return {Object}
 */
function debounce(ms) {
  return throttle(ms, true);
}

export default debounce;
