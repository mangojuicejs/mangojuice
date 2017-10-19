import { nextId, is, maybeForEach, ensureCmdObject, fastTry } from "./Utils";
import * as Task from "./Task";


// Utils
function createCommand(name, func, exec, opts) {
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

function getCommandName(funcName, ctx) {
  const ctxName = ctx && (ctx.name || ctx.constructor.name);
  return ctxName ? `${ctxName}.${funcName}` : funcName;
}

function execDefault(context) {
  return this.func && this.func.call(context, ...this.args);
}

function getCommandDescriptor(obj, name, descr, cmdCreator, opts = {}) {
  return {
    configurable: true,
    enumerable: true,
    value: cmdCreator(name, descr.value, opts)
  };
}

// Utils
export function appendArgs(cmd, args) {
  cmd = ensureCmdObject(cmd);
  cmd.args = cmd.args.concat(args);
  return cmd;
}

export function setContext(cmd, ctx) {
  cmd = ensureCmdObject(cmd);
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
export function execUpdate(context) {
  return execDefault.call(this, context);
}
export function createUpdateCmd(name, func) {
  return createCommand(name, func, execUpdate);
}
export function update(obj, name, descr) {
  return getCommandDescriptor(obj, name, descr, createUpdateCmd);
}

// Batch cmd
export function execBatch(context) {
  return execDefault.call(this, context);
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
  const {
    task, executor, successCmd,
    failCmd, customArgs
  } = this.func.call(props, ...this.args);

  // Debounce the execution (by default)
  if (!this.opts.options.every) {
    this.opts.cancelProcess(procId);
  }

  // Trun the task on next cycle
  const cancel = () => proc && proc.cancel();
  const done = new Promise((resolve, reject) =>
    Task.delay(0).then(() => {
      const handleResult = ({ result, error }) => {
        this.opts.cleanupExec(procId, execId);
        if (error) {
          if (error.cancelled) {
            reject(createNopeCmd(`${this.funcName}.Cancelled`)());
          } else {
            const actualFailCmd = failCmd && appendArgs(failCmd, [error])
            if (!actualFailCmd) props.model.__proc.logExecutionError(error);
            reject(actualFailCmd);
          }
        } else {
          const actualSuccessCmd = successCmd && appendArgs(successCmd, [result]);
          resolve(actualSuccessCmd);
        }
      };
      const res = fastTry(() => {
        proc = executor(task, props, ...(customArgs || this.args));
        proc.then(handleResult, handleResult);
      })
      if (res.error) {
        handleResult(res);
      }
    })
  );

  // Track task execution for cancellation
  this.opts.trackExec(procId, execId, done, cancel);
  return done;
}
export function createTaskCmd(name, func, opts = {}) {
  const helpers = {
    executors: {},
    options: opts,
    cancelProcess(pid) {
      const execs = this.executors[pid];
      if (execs) {
        for (const eid in this.executors[pid]) {
          execs[eid].cancel();
        }
        delete this.executors[pid];
      }
    },
    trackExec(procId, execId, done, cancel) {
      this.executors[procId] = this.executors[procId] || {};
      this.executors[procId][execId] = { done, cancel };
    },
    cleanupExec(procId, execId) {
      if (this.executors[procId] && this.executors[procId][execId]) {
        delete this.executors[procId][execId];
      }
    }
  };
  function cancelTaskCommand(opts) {
    if (opts && opts.all) {
      for (const pid in helpers.executors) {
        helpers.cancelProcess(pid);
      }
    } else {
      const pid = this.model.__proc.id;
      helpers.cancelProcess(pid);
    }
  };
  const cmd = createCommand(name, func, execTask, helpers);
  cmd.Cancel = createCommand(`${name}.Cancel`, cancelTaskCommand, execDefault);
  return cmd;
}
export function task(...args) {
  if (args.length === 1) {
    const [ options ] = args;
    return (obj, name, descr) => {
      return getCommandDescriptor(obj, name, descr, createTaskCmd, options);
    };
  } else {
    const [ obj, name, descr ] = args;
    return getCommandDescriptor(obj, name, descr, createTaskCmd);
  }
};

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

export function debounce(debounceTime = 100) {
  return (obj, name, descr) => {
    return getCommandDescriptor(obj, name, descr, createThrottleCmd, {
      debounceTime
    });
  };
}
