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
function DelayedExec(executor, cleanup, options) {
  this.finish = noop;
  this.executor = executor || noop;
  this.cleanup = cleanup || noop;
  this.delay = ZERO_DELAY ? 0 : (options.throttle || options.debounce || 0);
  this.debounce = options.debounce > 0;
  this.noInitCall = !!options.noInitCall;
  this.doExec = this.doExec.bind(this);
}

extend(DelayedExec.prototype, {
  exec(cmd) {
    if (this.isThrottled) {
      this.lastCmd = cmd;
      this.ensureExecution();
      if (this.debounce) this.restart();
      return;
    }

    this.isThrottled = true;
    this.restart();

    if (this.noInitCall && !this.calledOnce) {
      this.lastCmd = cmd;
      this.ensureExecution();
    } else {
      this.executor(cmd);
      this.finalize();
    }
  },

  doExec() {
    this.isThrottled = false;
    if (this.lastCmd) {
      this.calledOnce = true;
      const finalCmd = this.lastCmd;
      this.lastCmd = null;
      this.exec(finalCmd);
    } else {
      this.cleanup();
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
    this.cleanup();
  },

  restart() {
    clearInterval(this.timer);
    this.timer = setTimeout(this.doExec, this.delay);
  }
});

export default DelayedExec;
