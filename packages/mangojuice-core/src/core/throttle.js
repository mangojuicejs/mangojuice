import { is } from './utils';
import debounce from './debounce';


function throttle(wait, func, options) {
  let leading = true;
  let trailing = true;

  if (is.object(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  return debounce(wait, func, { maxWait: wait, leading, trailing });
}

export default throttle;
