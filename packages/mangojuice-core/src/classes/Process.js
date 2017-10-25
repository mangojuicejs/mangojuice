import * as Cmd from "./Cmd";
import LogicBase from '../classes/LogicBase';
import DefaultLogger from '../classes/DefaultLogger';
import {
  nextId,
  createResultPromise,
  is,
  maybeMap,
  maybeForEach,
  emptyArray,
  ensureCmdObject,
  memoize,
  noop,
  handleModelChanges,
  fastTry,

  MODEL_UPDATED_EVENT,
  CHILD_MODEL_UPDATED_EVENT,
  DESTROY_MODEL_EVENT
} from "./Utils";


// Utils
export const createContext = () => ({
  bindings: {}
});

/**
 * By provided value returns a new logic object
 * if possible. Otherwise throws an error;
 * @param  {Class|Object} logic
 * @return {Object}
 */
const ensureLogicObject = (logic) => {
  if (logic instanceof LogicBase) {
    return new logic.constructor();
  } else if (is.object(logic)) {
    return { ...LogicBase.prototype, ...logic };
  } else if (is.func(logic)) {
    return new logic();
  }
  throw new Error('You passed something weird instead of logic');
};

/**
 * Process class for executing logic on a model
 */
export class Process {
  constructor({
    rootProc,
    parentProc,
    sharedModel,
    execHandler,
    logger,
    appContext,
    logic,
    config,
    configArgs,
    execHandlers,
    singletonValue,
    parentComputedFn
  }) {
    this.id = nextId();
    this.rootProc = rootProc || this;
    this.parentProc = parentProc;
    this.sharedModel = sharedModel;
    this.execHandler = ensureCmdObject(execHandler);
    this.logger = logger || new DefaultLogger();
    this.appContext = appContext || createContext();
    this.configArgs = configArgs || emptyArray;
    this.logic = logic;
    this.config = config;
    this.execHandlers = execHandlers;
    this.singletonValue = singletonValue;
    this.parentComputedFn = parentComputedFn;
    this.portDestroyPromise = new Promise(r => this.portDestroyResolver = r);
  }

  bind(model) {
    this.prepareConfig();
    this.bindModel(model);
    this.bindCommands();
    this.bindChildren();
    this.bindComputed();
  }

  /**
   * Run `children` and `config` methods of the logic object
   * and create `config` object in the Process based on the result.
   * @return {[type]} [description]
   */
  prepareConfig() {
    if (this.config) return;
    this.logic = ensureLogicObject(this.logic);

    // Initialize config
    if (!this.logic.config) {
      this.config = {};
    } else {
      this.config = this.logic.config(...this.configArgs) || {};
    }

    // Initialize children logic
    if (this.logic.children) {
      this.config.children = this.logic.children() || {};
      this.config.childrenKeys = Object.keys(this.config.children);
    }

    // Ensure some config fields
    this.config.meta = this.config.meta || {};
    this.config.childrenKeys = this.config.childrenKeys || [];
  }

  prepareHandlers() {
    if (this.execHandlers) return;
    this.execHandlers = [];
    let currParent = this.parentProc;
    let currHandler = this.execHandler;
    while (currParent) {
      if (currHandler) {
        this.execHandlers.unshift({
          proc: currParent,
          handler: ensureCmdObject(currHandler)
        });
      }
      currHandler = currParent.execHandler;
      currParent = currParent.parentProc;
    }
  }

  /**
   * Create process and bind the process to child model
   * with given name. If model field is empty then do nothing.
   * If model already binded to some model do nothing.
   * Return true if model sucessfully binded to the process.
   * Othersise returns false
   * @param  {Object} childModel
   * @param  {String} fieldName
   * @return {Boolean}
   */
  bindChild(childModel, fieldName) {
    if (childModel && !childModel.__proc) {
      const subProc = new Process({
        ...this.config.children[fieldName],
        rootProc: this.rootProc,
        parentProc: this,
        sharedModel: this.sharedModel,
        appContext: this.appContext,
        logger: this.logger,
      });
      subProc.bind(childModel);
      return true;
    }
    return false;
  }

  bindChildren() {
    this.mapChildren(this.model, (childModel, fieldName) => {
      this.bindChild(childModel, fieldName);
    });
  }

  /**
   * Make all commands from logic to be binded to the model of this process.
   * Commands binded only in currecnt active app context.
   */
  bindCommands() {
    if (this.singletonValue && this.logic) {
      const bindedCommands = [];
      for (let k in this.logic) {
        const cmd = this.logic[k];
        if (is.command(cmd)) {
          this.appContext.bindings[cmd.id] = this;
          bindedCommands.push(cmd);
        }
      }
      this.bindedCommands = bindedCommands;
    }
  }

  /**
   * Replace fields in the model with computed getter with memoization
   * if defined in `logic.computed`.
   * Provide a way to define computed field with object block models
   * dependencies. So the field will be invalidated and re-computed
   * when one of dependent models will be changed.
   */
  bindComputed() {
    this.computedFields = emptyArray;
    if (this.logic.computed) {
      const ownComputedFields = this.safeExecFunction(() => this.logic.computed());
      if (ownComputedFields) {
        this.computedFields = maybeMap(Object.keys(ownComputedFields), k => {
          return this.defineComputedField(k, ownComputedFields[k]);
        });
      }
    }
  }

  defineComputedField(fieldName, computeVal) {
    let get = noop;

    if (is.func(computeVal)) {
      get = memoize(computeVal);
    } else if (is.object(computeVal)) {
      get = memoize(() => computeVal.computeFn(...computeVal.deps));
      const updateHandler = () => {
        get.reset();
        this.emitModelUpdate();
      };
      const destroyHandler = () => {
        this.bindComputed();
      };

      maybeForEach(computeVal.deps, m => {
        handleModelChanges(m, this.portDestroyPromise, updateHandler, destroyHandler);
      });
    }

    Object.defineProperty(this.model, fieldName, {
      enumerable: true,
      configurable: true,
      set: noop,
      get
    });

    return get;
  }

  /**
   * Associate instance of the Process with given model by setting
   * hidden `__proc` field in the model.
   * @param  {Object} model
   */
  bindModel(model) {
    this.logic.model = model;
    this.logic.shared = this.sharedModel;
    this.logic.exec = this.exec;
    this.logic.destroy = this.portDestroyPromise;
    this.logic.meta = this.config.meta;
    this.model = model;
    Object.defineProperty(this.model, "__proc", {
      value: this,
      enumerable: false,
      configurable: true
    });
  }

  /**
   * Run the process – run children processes, then run port and
   * init commands defined in config.
   * Returns a Promise which resolves when all commands will be
   * executed.
   * @return {Promise}
   */
  run() {
    const resPromise = createResultPromise();
    resPromise.add(this.runChildren());
    resPromise.add(this.runPorts());
    resPromise.add(this.runInitCommands());
    return resPromise.get();
  }

  runChildren() {
    return this.mapChildren(this.model, (childModel) =>
      childModel.__proc.run()
    );
  }

  runPorts() {
    if (this.logic.port) {
      const result = this.safeExecFunction(() => this.logic.port());
      return Promise.resolve(result);
    }
  }

  runInitCommands() {
    if (this.config.initCommands) {
      return Promise.all(
        maybeMap(this.config.initCommands, cmd => this.exec(cmd))
      );
    }
  }

  /**
   * Destroy the process with unbinding from the model and cleaning
   * up all the parts of the process (stop ports, computed
   * fields).
   * @param  {Boolean} deep If true then all children blocks will be destroyed
   */
  destroy(deep = true) {
    delete this.model.__proc;
    this.unbindCommands();
    this.stopPorts();
    this.emit(DESTROY_MODEL_EVENT);
    this.eventHandlers = null;
    if (deep) {
      this.mapChildren(this.model, x => x.__proc.destroy(true));
    }
  }

  stopPorts() {
    if (this.portDestroyResolver) {
      this.portDestroyResolver();
      this.portDestroyResolver = null;
      this.portDestroyPromise = null;
    }
  }

  resetComputedFields() {
    maybeForEach(this.computedFields, f => f.reset());
  }

  unbindCommands() {
    if (this.bindedCommands) {
      maybeForEach(this.bindedCommands, cmd =>
        delete this.appContext.bindings[cmd.id]
      );
    }
  }

  /**
   * Adds an event listener for given event name
   * @param {String} event
   * @param {Function} listener
   */
  addListener(event, listener) {
    if (listener) {
      this.eventHandlers = this.eventHandlers || {};
      this.eventHandlers[event] = this.eventHandlers[event] || [];
      this.eventHandlers[event].push(listener);
    }
  }

  removeListener(event, listener) {
    const handlers = this.eventHandlers && this.eventHandlers[event];
    if (handlers) {
      const newHandlers = [];
      maybeForEach(handlers, handler => {
        if (handler !== listener) {
          newHandlers.push(handler);
        }
      });
      this.eventHandlers[event] = newHandlers;
    }
  }

  emit(event, arg) {
    const handlers = this.eventHandlers && this.eventHandlers[event];
    return Promise.all(maybeMap(handlers, handler => handler(arg)));
  }

  emitModelUpdate = (cmd) => {
    const finalCmd = is.command(cmd) ? cmd : Cmd.defaultNopeCmd;
    return Promise.all([
      this.emit(MODEL_UPDATED_EVENT, finalCmd, this.model),
      this.rootProc.emit(CHILD_MODEL_UPDATED_EVENT, finalCmd, this.model)
    ]);
  }

  /**
   * Map children model fields which have associated
   * logic in `children` function of the logic using given
   * iterator function.
   * Returns a Promise which resolves with a list with data
   * returned by each call to iterator function.
   * @param  {Object} model
   * @param  {Function} iterator
   * @param  {Array} iterKeys
   * @return {Promise}
   */
  mapChildren(model, iterator, iterKeys) {
    if (!iterator || !this.config.children) {
      return Promise.resolve();
    }

    const resPromise = createResultPromise();
    const childrenKeys = iterKeys || this.config.childrenKeys || emptyArray;
    const childRunner = (childModel, k) => {
      resPromise.add(iterator(childModel, k));
    };
    const keyIterator = k =>
      this.config.children[k] && maybeForEach(model[k], x => childRunner(x, k));

    maybeForEach(childrenKeys, keyIterator);
    return resPromise.get();
  }

  /**
   * Update the binded model with update object passed as an argument.
   * Returns true when model was changed, otherwise returns false.
   * Also while updating process destryoy/create processes for
   * removed/added models.
   *
   * @param  {?Object} updateObj
   * @return {Boolean}
   */
  updateModel(updateObj) {
    if (!updateObj) return false;
    let rebindComputed = false;
    const tick = nextId();
    const updateKeys = Object.keys(updateObj);
    const updateMarker = (childModel, fieldName) => {
      if (this.bindChild(childModel, fieldName)) {
        rebindComputed = true;
        childModel.__proc.run();
      }
      childModel.__proc.tick = tick;
    };
    const unmarkedDestroyer = (childModel) => {
      if (childModel.__proc.tick !== tick) {
        rebindComputed = true;
        childModel.__proc.destroy();
      }
    };

    // Go throught all children models and mark which one
    // created and removed
    this.mapChildren(updateObj, updateMarker);
    this.mapChildren(this.model, unmarkedDestroyer, updateKeys);

    // Computed field may depend on child model, and when child
    // model destroyed/created we should reflect it in computed fields
    if (rebindComputed) {
      this.bindComputed();
    } else {
      this.resetComputedFields();
    }

    Object.assign(this.model, updateObj);
    return true;
  }

  /**
   * Execute some function in try/catch and if some error
   * accured print it to console and call logger function.
   * Returns result of function execution or null.
   * @param  {Function}    func
   * @return {any}
   */
  safeExecFunction(func, cmd) {
    const { result, error } = fastTry(func);
    if (error) {
      this.logExecutionError(error, cmd);
    }
    return result;
  }

  /**
   * Log execution error usign active logger and also
   * print the error to the console
   * @param  {Error} error
   * @param  {?Cmd} cmd
   */
  logExecutionError(error, cmd) {
    this.logger.onCatchError(error, cmd, this.model);
  }

  /**
   * Run all parent handler from parent processes to handle
   * executed command. Returns a promise which will be resolved
   * when all handlers will be fully executed.
   *
   * @param  {Object} model
   * @param  {Object} cmd
   * @return {Promise}
   */
  handleCommand(model, cmd, isBefore) {
    this.prepareHandlers();
    if (!cmd || !this.execHandlers.length) {
      return Promise.resolve();
    }

    this.logger.onStartHandling(cmd, this.model, isBefore);
    const resPromise = createResultPromise();
    maybeForEach(this.execHandlers, ({ handler, proc }) => {
      const handlerCmd = Cmd.appendArgs(handler.clone(), [cmd, model, isBefore]);
      handlerCmd.isHandler = true;
      const execRes = proc.exec(handlerCmd);
      resPromise.add(execRes);
    });

    this.logger.onEndHandling(cmd, this.model, isBefore);
    return resPromise.get();
  }

  /**
   * Actually execute the command. It iis running "before" handler,
   * then command itself, then "after" handlers and then emit
   * "update" event on the process if model was updated.
   * Returns a promise which will be resolved when a command
   * will be fully executed (command + all handlers).
   *
   * @param  {Object} cmd
   * @return {Promise}
   */
  doExecCmd(cmd) {
    cmd = Cmd.setContext(cmd, this.logic).model(this.model);
    this.logger.onStartExec(cmd, this.model);

    // Run before handlers
    const resPromise = createResultPromise();
    resPromise.add(this.handleCommand(this.model, cmd, true));

    // Run the command
    let modelUpdated = false;
    const result = this.safeExecFunction(
      () => cmd.exec(this.logic), cmd);

    // Handle results of the execution
    if (result) {
      if (cmd.exec === Cmd.execBatch) {
        const batchRes = maybeMap(result, x => this.exec(x));
        resPromise.add(Promise.all(batchRes));
      } else if (cmd.exec === Cmd.execUpdate) {
        modelUpdated = this.updateModel(result);
      } else if (cmd.exec === Cmd.execTask) {
        resPromise.add(result.then(this.exec, this.exec));
      }
    }
    this.logger.onExecuted(cmd, this.model, result);

    // Run after handlers
    cmd.id = cmd.afterId;
    resPromise.add(this.handleCommand(this.model, cmd, false));

    // Run model update subscriptions
    if (modelUpdated) {
      this.logger.onEmitSubscriptions(cmd, this.model);
      resPromise.add(this.emitModelUpdate(cmd));
    }

    // Move back id of the cmd (to make cmd object reusable)
    cmd.id = cmd.beforeId;
    this.logger.onEndExec(cmd, this.model, result);
    return resPromise.get();
  }

  /**
   * Exec a command in scope of the Process instance.
   * It will use binded model and logic object to run the
   * command. The command could be function (command creator)
   * or object (command instance).
   * If command is undefined or `Process` instance not binded
   * to any model it will return resolved promise.
   * Otherwise it will return a promise that will be resolved
   * when the commend will be fully executed (command + handlers)
   *
   * @param  {Function|Object} cmd [description]
   * @return {Promise}
   */
  exec = cmd => {
    // Ensure cmd is an object
    if (!cmd) return Promise.resolve();
    cmd = ensureCmdObject(cmd);

    // When command binded individually to some model –
    // run command in appropreate processor
    if (cmd._model && cmd._model !== this.model && cmd._model.__proc) {
      cmd.__redirected = true;
      return cmd._model.__proc.exec(cmd);
    }

    // When command globally binded to some model –
    // run command in appropreate processor
    const bindProc = this.appContext.bindings[cmd.id];
    if (!cmd.__redirected && bindProc && bindProc !== this) {
      return bindProc.exec(cmd);
    }

    // No process binded to the model
    if (!this.model.__proc) {
      return Promise.resolve();
    }

    return this.doExecCmd(cmd);
  }
}

export default Process;


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
