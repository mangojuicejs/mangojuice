import { extend, noop, idenitify } from '../core/utils';


function ContextCmd(contextFn) {
  this.contextFn = contextFn;
  this.id = idenitify(contextFn);
}

extend(ContextCmd.prototype, /** @lends ContextCmd.prototype */{
  update(obj) {
    this.updateObj = obj;
    return this;
  },

  create(...args) {
    this.createArgs = args;
    return this;
  },

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
