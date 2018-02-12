import { extend, noop } from '../core/utils';
import { ZERO_DELAY } from '../config';


/**
 * An async task executor which aimed only to help with
 * delayed (throttle/debounce) command execution.
 * Supports to run in "debounce" and "throttle" mode,
 * with instant init call or without.
 *
 * @private
 */
function ThrottleTask(executor, options) {
  this.finish = noop;
  this.executor = executor || noop;
  this.wait = ZERO_DELAY ? 0 : (options.throttle || options.debounce || 0);
  this.debounce = options.debounce > 0;
  this.leading = 'leading' in options ? !!options.leading : false;
  this.trailing = 'trailing' in options ? !!options.trailing : true;
  this.doExec = this.doExec.bind(this);
}

extend(ThrottleTask.prototype, {
  exec(taskObj) {
    if (this.isThrottled) {
      this.lastTask = taskObj;
      this.ensureExecution();
      if (this.debounce) this.restart();
      return this.execution;
    }

    this.isThrottled = true;
    this.restart();

    if (!this.leading && !this.calledOnce) {
      this.ensureExecution();
      this.lastTask = taskObj;
    } else {
      this.executor(...taskObj.customArgs);
      this.finalize();
    }

    return this.execution;
  },

  doExec() {
    this.isThrottled = false;
    if (this.lastTask) {
      this.calledOnce = true;
      const finalTask = this.lastTask;
      this.lastTask = null;
      this.exec(finalTask);
    } else {
      this.finalize();
    }
  },

  ensureExecution() {
    if (!this.execution) {
      this.execution = new Promise(r => this.finish = r);
    }
  },

  finalize() {
    this.finish();
    this.execution = null;
    this.finish = noop;
  },

  cancel() {
    clearInterval(this.timer);
    this.finalize();
  },

  restart() {
    clearInterval(this.timer);
    this.timer = setTimeout(this.doExec, this.wait);
  }
});

export default ThrottleTask;
