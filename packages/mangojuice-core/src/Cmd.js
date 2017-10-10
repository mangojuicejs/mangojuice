import { nextId, is, maybeForEach, ensureCmdObject } from "./Utils";
import * as Task from "./Task";

// Utils
export function createCommand(name, func, exec, opts) {
  const creator = function(...args) {
    return {
      func,
      exec,
      args,
      opts,
      creator,
      id: creator.Before.id,
      beforeId: creator.Before.id,
      afterId: creator.After.id,
      isCmd: true,
      funcName: name,
      name: getCommandName(name, this),
      context: this,

      model(modelObj) {
        this._model = modelObj;
        return this;
      },
      clone() {
        return { ...this };
      },
      get isBefore() {
        return this.id === this.beforeId;
      },
      get isAfter() {
        return this.id === this.afterId;
      },
      is(cmd, model) {
        return cmd &&
          (this.id === cmd.id || this.name === cmd) &&
          (!model || this._model === model);
      }
    };
  };
  creator.Before = { id: nextId() };
  creator.After = { id: nextId() };
  creator.id = creator.Before.id;
  return creator;
}

export function appendArgs(cmd, args) {
  cmd = ensureCmdObject(cmd);
  cmd.args = cmd.args.concat(args);
  return cmd;
}

export function setContext(cmd, ctx) {
  cmd = ensureCmdObject(cmd);
  cmd.context = ctx;
  cmd.name = getCommandName(cmd.funcName, ctx);
  return cmd;
}

export function hash(cmd) {
  // TODO optimize for primitives
  if (is.func(cmd)) {
    return `${cmd.id}`;
  } else {
    cmd = ensureCmdObject(cmd);
    const argsHash = cmd.args.length > 0 ? JSON.stringify(cmd.args) : "";
    return `${cmd.id}${argsHash}`;
  }
}

export function getCommandName(funcName, ctx) {
  return ctx && ctx.name ? `${ctx.name}.${funcName}` : funcName;
}

export function execDefault(props) {
  return this.func && this.func.call(this.context, props, ...this.args);
}

export function getCommandDescriptor(obj, name, descr, cmdCreator, opts = {}) {
  return {
    configurable: true,
    enumerable: true,
    value: cmdCreator(name, descr.value, opts)
  };
}

// Nope command
export function execNope() {}
export function createNopeCmd(name) {
  return createCommand(name, null, execNope);
}
export function nope(obj, name, descr) {
  return getCommandDescriptor(obj, name, descr, createNopeCmd);
}
export const defaultNopeCmd = createNopeCmd("Nope");

// Update command
export function execUpdate(props) {
  return execDefault.call(this, props);
}
export function createUpdateCmd(name, func) {
  return createCommand(name, func, execUpdate);
}
export function update(obj, name, descr) {
  return getCommandDescriptor(obj, name, descr, createUpdateCmd);
}

// Batch cmd
export function execBatch(props) {
  return execDefault.call(this, props);
}
export function createBatchCmd(name, func) {
  return createCommand(name, func, execBatch);
}
export function batch(obj, name, descr) {
  return getCommandDescriptor(obj, name, descr, createBatchCmd);
}

// Task cmd
export function execTask(props) {
  let proc;
  const execId = nextId();
  const procId = props.model.__proc.id;
  const { task, successCmd, failCmd } = this.func.call(
    this.context,
    props,
    ...this.args
  );

  if (this.opts.debounce) {
    this.opts.cancelAll(props);
  }

  const cancel = () => proc && proc.cancel();
  const done = new Promise((resolve, reject) => {
    const handleFail = err => {
      this.opts.cleanupExec(procId, execId);
      if (err && err.cancelled) {
        reject(createNopeCmd(`${this.funcName}.Cancelled`)());
      } else {
        const actualFailCmd = failCmd && appendArgs(failCmd, [err])
        if (!actualFailCmd) proc.logExecutionError(err);
        reject(actualFailCmd);
      }
    };

    const handleSuccess = res => {
      this.opts.cleanupExec(procId, execId);
      const actualSuccessCmd = successCmd && appendArgs(successCmd, [res]);
      resolve(actualSuccessCmd);
    };

    try {
      proc = Task.call(task, props, ...this.args);
      return proc.then(handleSuccess, handleFail);
    } catch (err) {
      handleFail(err);
    }
  });

  this.opts.trackExec(procId, execId, done, cancel);
  return done;
}
export function createTaskCmd(name, func, opts = {}) {
  const executors = {};
  const cmdOpts = {
    ...opts,
    cancelAll({ model }) {
      const procId = model.__proc.id;
      const execs = executors[procId];
      if (execs) {
        Object.keys(execs).forEach(k => execs[k].cancel());
        delete executors[procId];
      }
    },
    trackExec(procId, execId, done, cancel) {
      executors[procId] = executors[procId] || {};
      executors[procId][execId] = { done, cancel };
    },
    cleanupExec(procId, execId) {
      if (executors[procId] && executors[procId][execId]) {
        delete executors[procId][execId];
      }
    }
  };

  const cmdCreator = createCommand(name, func, execTask, cmdOpts);
  cmdCreator.Cancel = createCommand(`${name}.Cancel`, null, cmdOpts.cancelAll);
  return cmdCreator;
}
export function execEvery(obj, name, descr) {
  return getCommandDescriptor(obj, name, descr, createTaskCmd);
}
export function execLatest(obj, name, descr) {
  return getCommandDescriptor(obj, name, descr, createTaskCmd, {
    debounce: true
  });
}

// Throttle helper cmd
export function createThrottleCmd(name, func, { throttleTime, debounceTime }) {
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
  const throttleExecCmd = createBatchCmd(`${name}.Throttle.Exec`, function(
    props
  ) {
    const procId = props.model.__proc.id;
    const args = helpers.extractExecContext(procId);
    return func(...args);
  });
  const throttleDelayCmd = createTaskCmd(
    `${name}.Throttle.Delay`,
    function() {
      function thDelay() {
        return this.call(Task.delay, throttleTime || debounceTime);
      }
      return Task.create(thDelay).success(throttleExecCmd());
    },
    { debounce: debounceTime > 0 }
  );
  const throttleCancelCmd = createBatchCmd(`${name}.Throttle.Cancel`, function(
    props
  ) {
    const procId = props.model.__proc.id;
    helpers.extractExecContext(procId);
    return [throttleDelayCmd.Cancel(), func.Cancel && func.Cancel()];
  });
  const throttleDecideCmd = createBatchCmd(`${name}.Throttle`, function(
    props,
    ...args
  ) {
    const procId = props.model.__proc.id;
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

export function debounce(debounceTime = 100) {
  return (obj, name, descr) => {
    return getCommandDescriptor(obj, name, descr, createThrottleCmd, {
      debounceTime
    });
  };
}
