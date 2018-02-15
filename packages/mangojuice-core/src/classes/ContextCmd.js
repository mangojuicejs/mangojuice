import { extend, noop, identify } from '../core/utils';
import ChildCmd from './ChildCmd';


function ContextCmd(contextFn) {
  this.contextFn = contextFn;
  this.id = identify(contextFn);
}

extend(ContextCmd.prototype, ChildCmd.prototype);
extend(ContextCmd.prototype, /** @lends ContextCmd.prototype */{
  subscribe() {
    this.subscribeVal = true;
    return this;
  },

  get(requestFn) {
    this.requestFn = requestFn;
    return this;
  }
});

export default ContextCmd;
