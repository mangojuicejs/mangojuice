import { is, nextId } from '../utils';
import cmd, { createCommandFactory } from './cmd';
import procOf from '../logic/procOf';
import task from '../task/task';
import { CANCEL } from '../task/callTask';
import delay from '../task/delay';

/**
 * Returns throttle state for given model and throttle id
 * Uses Process instance attached to the model to store
 * throttle state
 * @param  {Object} model
 * @param  {string} id
 * @return {Object}
 */
function getThrottleState(model, id) {
  const proc = procOf(model);
  const throttles = proc.throttles || {};
  const state = throttles[id] || {};
  throttles[id] = state;
  proc.throttles = throttles;
  return state;
}

/**
 * Decorator which implements classical throttle logic
 * around some original command. Should be applied only
 * for a command factory (`@cmd` decorated function)
 * @param  {number} ms
 * @return {function}
 */
function throttle(ms, { debounce, noInitCall } = {}) {
  return (obj, name, descr) => {
    const thId = nextId();
    const orgFunc = descr.__func || descr.value;
    const orgCmd = createCommandFactory(name, null, false, orgFunc);

    // Cancellable task for waiting given amount of ms
    const throttleWaitTask = function({ model }) {
      const state = getThrottleState(model, thId);
      if (debounce) {
        if (state.initTimer) state.initTimer[CANCEL]();
        return this.call(delay, ms);
      }
      if (state.initTimer) {
        return state.initTimer.then();
      }
    };

    // Execute original command if needed
    const throttleExecCmd = createCommandFactory(
      `${name}.Exec`,
      null,
      true,
      function() {
        const state = getThrottleState(this.model, thId);
        state.throttled = false;
        state.calledOnce = false;
        if (state.args) {
          const execCmd = this[name](...state.args);
          state.calledOnce = true;
          state.args = null;
          return execCmd;
        }
      }
    );

    // Just wait give amount of ms
    const throttleWaitCmd = createCommandFactory(
      `${name}.Wait`,
      null,
      true,
      function() {
        return task(throttleWaitTask).success(throttleExecCmd);
      }
    );

    // Function used instead of original func
    const throttleWrapper = function(...args) {
      const state = getThrottleState(this.model, thId);
      if (state.throttled || (noInitCall && !state.calledOnce)) {
        state.args = args;
      }
      if (state.throttled) {
        return throttleWaitCmd;
      }

      state.throttled = true;
      state.initTimer = delay(ms);
      state.initTimer.then(() => {
        if (!state.args) {
          state.throttled = false;
          state.initTimer = null;
        }
      });

      return noInitCall && !state.calledOnce
        ? throttleWaitCmd
        : orgCmd(...args);
    };

    descr.value = throttleWrapper;
    return cmd(obj, name, descr, true, `${name}.Throttle`);
  };
}

export default throttle;
