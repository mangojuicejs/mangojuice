// Throttle helper cmd
function createThrottleCmd(name, func, { throttleTime, debounceTime }) {
  // Helper object for storing internal throttling state
  const helpers = {
    counts: {},
    contexts: {},
    setExecuting(procId) {
      this.counts[procId] = 1;
    },
    isExecuting(procId) {
      return this.counts[procId] > 0;
    },
    saveExecContext(procId, args) {
      this.contexts[procId] = args;
    },
    extractExecContext(procId) {
      delete this.counts[procId];
      const context = this.contexts[procId];
      delete this.contexts[procId];
      return context;
    }
  };

  // Throttle logic commands
  const throttleNopeCmd = createNopeCmd(`${name}.Throttle.Nope`);
  const throttleExecCmd = createBatchCmd(`${name}.Throttle.Exec`, function() {
    const procId = this.model.__proc.id;
    const args = helpers.extractExecContext(procId);
    return func(...args);
  });
  function thDelay() {
    return this.call(Task.delay, throttleTime || debounceTime);
  }
  const throttleDelayCmd = createTaskCmd(
    `${name}.Throttle.Delay`,
    function() {
      return Task.create(thDelay).success(throttleExecCmd());
    },
    { debounce: debounceTime > 0 }
  );
  const throttleCancelCmd = createBatchCmd(`${name}.Throttle.Cancel`, function() {
    const procId = this.model.__proc.id;
    helpers.extractExecContext(procId);
    return [throttleDelayCmd.Cancel(), func.Cancel && func.Cancel()];
  });
  const throttleDecideCmd = createBatchCmd(`${name}.Throttle`, function(...args) {
    const procId = this.model.__proc.id;
    helpers.saveExecContext(procId, args);
    if (helpers.isExecuting(procId) && !debounceTime) {
      return throttleNopeCmd();
    } else {
      helpers.setExecuting(procId);
      return throttleDelayCmd();
    }
  });

  // Save origin command to be able to handle it
  throttleDecideCmd.Origin = func;
  throttleDecideCmd.Cancel = throttleCancelCmd;
  return throttleDecideCmd;
}

export function throttle(throttleTime = 100) {
  return (obj, name, descr) => {
    return getCommandDescriptor(obj, name, descr, createThrottleCmd, {
      throttleTime
    });
  };
}
