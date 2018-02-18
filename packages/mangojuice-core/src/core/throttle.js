import { is } from './utils';
import debounce from './debounce';


function throttle(func, wait, options) {
  let leading = true;
  let trailing = true;

  if (is.object(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  return debounce(func, wait, { wait, leading, trailing });
}

export default throttle;
