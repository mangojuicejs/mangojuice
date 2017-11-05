import { is, nextId } from "../utils";
import cmd, { createCommandFactory } from './cmd';
import procOf from '../logic/procOf';
import task from '../task/task';
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
function throttle(ms, debounce) {
  return (obj, name, descr) => {
    const thId = nextId();
    const orgFunc = descr.__func || descr.value;
    const orgCmd = createCommandFactory(name, null, false, orgFunc);

    // Cancellable task for waiting given amount of ms
    const throttleWaitTask = function() {
      return this.call(delay, ms);
    }

    // Execute original command if needed
    const throttleExecCmd = createCommandFactory(`${name}.Exec`, null, true, function() {
      const state = getThrottleState(this.model, thId);
      state.throttled = false;
      if (state.args) {
        const execCmd = this[name](...state.args);
        state.args = null;
        return execCmd;
      }
    });

    // Just wait give amount of ms
    const throttleWaitCmd = createCommandFactory(`${name}.Wait`, null, true, function() {
      return task(throttleWaitTask).success(throttleExecCmd);
    });

    // Function used instead of original func
    const throttleWrapper = function(...args) {
      const state = getThrottleState(this.model, thId);
      if (state.throttled) {
        state.args = args;
        return debounce && throttleWaitCmd;
      }
      state.throttled = true;
      return [ orgCmd(...args), throttleWaitCmd ];
    };

    descr.value = throttleWrapper;
    return cmd(obj, name, descr, true, `${name}.Throttle`);
  };
}

export default throttle;
