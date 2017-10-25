/**
 * Creates a Task object that could be returned from
 * async task command.
 * @param  {Function} task
 * @return {Object}
 */
export function task(taskFn) {
  return {
    task: taskFn,
    executor: call,
    success(cmd) {
      this.successCmd = cmd;
      return this;
    },
    execEvery(val) {
      this.execEvery = val;
      return this;
    },
    fail(cmd) {
      this.failCmd = cmd;
      return this;
    },
    engine(engine) {
      this.executor = engine;
      return this;
    },
    args(...args) {
      this.customArgs = args;
      return this;
    }
  };
}

export default task;
