import { extend, noop, is } from '../core/utils';
import { ZERO_DELAY } from '../config';

/**
 * An async task executor which aimed only to help with
 * delayed (throttle/debounce) command execution.
 * Supports to run in "debounce" and "throttle" mode,
 * with instant init call or without.
 *
 * @private
 */
function DebounceTask(proc, { wait, options }) {
  this.lastTask = undefined;
  this.maxWait = undefined;
  this.timerId = undefined;
  this.lastCallTime = undefined;
  this.lastInvokeTime = 0;
  this.leading = false;
  this.maxing = false;
  this.trailing = true;
  this.wait = +wait || 0;

  if (is.object(options)) {
    this.leading = !!options.leading;
    this.maxing = 'maxWait' in options;
    this.maxWait = this.maxing ? Math.max(+options.maxWait || 0, this.wait) : this.maxWait;
    this.trailing = 'trailing' in options ? !!options.trailing : this.trailing;
  }

  this.proc = proc;
  this.timerExpired = this.timerExpired.bind(this);
  this.finish = noop;
}

extend(DebounceTask.prototype, {
  exec(taskObj) {
    const time = Date.now();
    const isInvoking = this.shouldInvoke(time);
    this.ensureExecution();

    this.lastTask = taskObj;
    this.lastCallTime = time;

    if (isInvoking) {
      if (this.timerId === undefined) {
        this.leadingEdge(this.lastCallTime);
      } else if (this.maxing) {
        // Handle invocations in a tight loop.
        this.timerId = this.startTimer(this.timerExpired, this.wait);
        this.invokeFunc(this.lastCallTime);
      }
    } else if (this.timerId === undefined) {
      this.timerId = this.startTimer(this.timerExpired, this.wait);
    }

    return this.execution;
  },

  invokeFunc(time) {
    const { task, customArgs } = this.lastTask;
    this.lastTask = undefined;
    this.lastInvokeTime = time;
    this.proc.exec(() => task.apply(this.proc.logic, customArgs));
  },

  startTimer(pendingFunc, wait) {
    return setTimeout(pendingFunc, wait);
  },

  cancelTimer(id) {
    clearTimeout(id);
  },

  leadingEdge(time) {
    // Reset any `maxWait` timer.
    this.lastInvokeTime = time;
    // Start the timer for the trailing edge.
    this.timerId = this.startTimer(this.timerExpired, this.wait);
    // Invoke the leading edge.
    if (this.leading) {
      this.invokeFunc(time);
    }
  },

  remainingWait(time) {
    const timeSinceLastCall = time - this.lastCallTime;
    const timeSinceLastInvoke = time - this.lastInvokeTime;
    const timeWaiting = this.wait - timeSinceLastCall;

    return this.maxing
      ? Math.min(timeWaiting, this.maxWait - timeSinceLastInvoke)
      : timeWaiting;
  },

  shouldInvoke(time) {
    const timeSinceLastCall = time - this.lastCallTime;
    const timeSinceLastInvoke = time - this.lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (
      this.lastCallTime === undefined ||
      timeSinceLastCall >= this.wait ||
      timeSinceLastCall < 0 ||
      (this.maxing && timeSinceLastInvoke >= this.maxWait)
    );
  },

  timerExpired() {
    const time = Date.now();
    if (this.shouldInvoke(time)) {
      return this.trailingEdge(time);
    }
    // Restart the timer.
    this.timerId = this.startTimer(this.timerExpired, this.remainingWait(time));
  },

  trailingEdge(time) {
    this.timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (this.trailing && this.lastTask) {
      this.invokeFunc(time);
    } else {
      this.lastTask = undefined;
    }

    this.finalize();
  },

  cancel() {
    if (this.timerId !== undefined) {
      this.cancelTimer(this.timerId);
    }
    this.lastInvokeTime = 0;
    this.lastTask = this.lastCallTime = this.timerId = undefined;
    this.finalize(null, { cancelled: true });
  },

  ensureExecution() {
    if (!this.execution) {
      this.execution = new Promise(r => this.finish = r);
    }
  },

  finalize(result, error) {
    this.finish({ result, error });
    this.execution = null;
    this.finish = noop;
  }
});

export default DebounceTask;
