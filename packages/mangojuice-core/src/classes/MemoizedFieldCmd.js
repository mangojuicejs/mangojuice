import { extend } from '../core/utils';


function MemoizedFieldCmd(computeFn) {
  this.computeFn = computeFn;
}

extend(MemoizedFieldCmd.prototype, /** @lends MemoizedFieldCmd.prototype */{
});

export default MemoizedFieldCmd;
