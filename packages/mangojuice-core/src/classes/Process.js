import Task from './Task';
import Command from './Command';
import DelayedExec from './DelayedExec';
import DefaultLogger from './DefaultLogger';
import ensureCommand from '../core/cmd/ensureCommand';
import createCmd from '../core/cmd/cmd';
import observe, { incExecCounter, decExecCounter } from '../core/logic/observe';
import procOf from '../core/logic/procOf';
import delay from '../core/task/delay';
import { cancelTask } from '../core/cmd/cancel';
import {
  nextId,
  is,
  maybeMap,
  maybeForEach,
  memoize,
  noop,
  fastTry,
  extend,
  deepForEach,
  safeExecFunction
} from '../core/utils';


// Constants
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const EMPTY_FINISHED = Promise.resolve();
const DELAY_TASK = 'DELAY';

/**
 * Go from current proc to the root of the proc tree
 * and run iterator function if handler of given type
 * exists in the process instance.
 * @param  {Process} proc
 * @param  {string} type
 * @param  {function} iterator
 */
function mapParents(proc, iterator) {
  let currParent = proc.parent;
  const res = [];
  while (currParent) {
    res.push(iterator(currParent));
    currParent = currParent.parent;
  }
  return res;
}

/**
 * By given Process instance find some parent process
 * in the tree without parents (tree root)
 * @param  {Process} proc
 * @return {Process}
 */
function findRootProc(proc) {
  let currParent = proc;
  while (currParent) {
    const nextParent = currParent.parent;
    if (!nextParent) {
      return currParent;
    }
    currParent = nextParent;
  }
}

/**
 * Run `children` and `config` methods of the logic object
 * and create `config` object in the Process based on the result.
 */
function prepareConfig(proc) {
  const { logicClass, configArgs } = proc;
  const logic = new logicClass();
  proc.logic = logic;

  if (!logic.hubBefore && logic.hub) {
    logic.hubBefore = logic.hub;
  }

  let config = { children: EMPTY_OBJECT, childrenKeys: EMPTY_ARRAY, meta: {} };
  config = (logic.config && logic.config(...configArgs)) || {};
  config.meta = config.meta || {};
  logic.meta = config.meta;
  proc.config = config;

  if (logic.children) {
    config.children = logic.children() || {};
    config.childrenKeys = Object.keys(config.children);
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
function bindChild(proc, childModel, fieldName) {
  if (childModel && !procOf(childModel, true)) {
    const childDef = proc.config.children[fieldName];
    const logic = is.func(childDef) ? childDef : childDef.logic;
    const configArgs = is.func(childDef) ? EMPTY_ARRAY : childDef.args;

    const subProc = new proc.constructor({
      logic,
      configArgs,
      parent: proc,
      context: proc.context,
      sharedModel: proc.sharedModel,
      logger: proc.logger
    });
    subProc.bind(childModel);
    return true;
  }
  return false;
}

/**
 * Go throught all children fields and bind each child
 * model to appropreate logic
 * @param  {Process} proc
 */
function bindChildren(proc) {
  forEachChildren(proc, proc.model, (childModel, fieldName) => {
    bindChild(proc, childModel, fieldName);
  });
}

/**
 * Stop all running observers for all existing computed fields
 * @param  {Process} proc
 */
function stopComputedObservers(proc) {
  const { computedFields } = proc;
  maybeForEach(computedFields, (f) => {
    maybeForEach(f.observers, (o) => o());
  });
}

/**
 * Replace fields in the model with computed getter with memoization
 * if defined in `logic.computed`.
 * Provide a way to define computed field with object block models
 * dependencies. So the field will be invalidated and re-computed
 * when one of dependent models will be changed.
 */
function bindComputed(proc) {
  if (proc.destroyed) return;

  const { logic, logger } = proc;
  let computedFields = EMPTY_ARRAY;
  stopComputedObservers(proc);

  if (logic.computed) {
    const ownComputedFields = safeExecFunction(logger, () =>
      logic.computed()
    );
    if (ownComputedFields) {
      const computedFieldBinder = k =>
        bindComputedField(proc, k, ownComputedFields[k]);
      computedFields = maybeMap(
        Object.keys(ownComputedFields),
        computedFieldBinder
      );
    }
  }

  proc.computedFields = computedFields;
}

/**
 * Bind field in the model with given computed function or dependency
 * object.
 * @param  {Process} proc
 * @param  {string} fieldName
 * @param  {function|DependsDef} computeVal
 * @return {Memoize}
 */
function bindComputedField(proc, fieldName, computeVal) {
  let get = noop;

  if (is.func(computeVal)) {
    get = memoize(computeVal);
  } else if (is.object(computeVal)) {
    get = memoize(() => computeVal.computeFn(...computeVal.deps));
    const updateHandler = () => {
      if (get.computed()) {
        get.reset();
        runAllObservers(proc);
      }
    };
    get.observers = maybeMap(computeVal.deps, m => observe(m, updateHandler));
  }

  Object.defineProperty(proc.model, fieldName, {
    enumerable: true,
    configurable: true,
    set: noop,
    get
  });

  return get;
}

/**
 * Get proc attached to given model, find root proc
 * in the tree and add new parent proc to the root,
 * so given proc will become a new root in the tree
 * @param  {Object} model
 * @param  {Process} newRoot
 */
function bindShared(proc, sharedModel) {
  // Check that proc of model exists
  const modelProc = procOf(sharedModel, true);
  if (!modelProc) return;

  // Update existing binding or create a new one
  if (proc.sharedBinding) {
    proc.sharedBinding.logic = proc.logic;
    return;
  }

  // Actually add a new root with only some parms
  // to work with `handleCommand` function in Process
  const newRoot = {
    parent: null,
    logic: proc.logic,
    exec: proc.exec
  };

  // Check that proc of the model is from different tree
  const rootProc = findRootProc(modelProc);
  const rootOfNewProc = findRootProc(proc);
  if (rootProc === rootOfNewProc) return;

  // Add new root to shared block
  rootProc.parent = newRoot;
  const removeTreeNode = () => (rootProc.parent = newRoot.parent);
  proc.destroyPromise.then(removeTreeNode);
  proc.sharedBinding = newRoot;

  // Resuse app context from shared block
  proc.context = modelProc.context;
}

/**
 * Associate instance of the Process with given model by setting
 * hidden `__proc` field in the model. Also set model and shared model,
 * @param  {Process} proc
 * @param  {Object} model
 */
function bindModel(proc, model) {
  const { logic, sharedModel } = proc;
  proc.model = model;
  logic.model = model;
  logic.shared = sharedModel;

  Object.defineProperty(model, '__proc', {
    value: proc,
    enumerable: false,
    configurable: true
  });

  bindShared(proc, sharedModel);
}

/**
 * Itereate through all children models with logic assigned
 * and run binded process. Returns a Promise which will be
 * resolved when all inicialisation of all children logics
 * will be finished.
 * @param  {Process} proc
 * @return {Promise}
 */
function runChildren(proc) {
  const childRunner = childModel => procOf(childModel).run();
  forEachChildren(proc, proc.model, childRunner);
}

/**
 * Execute `port` method of the logic, if provided. Returns a Promise
 * which will be resolved when returend by `port` promise will be resolved.
 * If `port` returns not a Promise then it will be resolved instantly.
 * @param  {Process} proc
 * @return {Promise}
 */
function runPorts(proc) {
  const { logic, logger, destroyPromise, exec } = proc;
  if (logic.port) {
    logic.port(exec, destroyPromise);
  }
}

/**
 * Execute init commands which could be defined in `config` method
 * of the object. Returns a Promise which will be resolved when
 * all init commands will be fully executed.
 * @param  {Process} proc
 * @return {Promise}
 */
function runInitCommands(proc) {
  const { config: { initCommands }, exec } = proc;
  if (initCommands) {
    maybeForEach(initCommands, function initCmdIterator(cmd) {
      exec(cmd);
    });
  }
}

/**
 * Ren all model observers and returns a Promise which will
 * be resolved when all handlers executed and returned promises
 * is also resolved
 * @param  {Process} proc
 * @return {Promise}
 */
function runAllObservers(proc) {
  maybeForEach(proc.observers, function observersIterator(obs) {
    safeExecFunction(proc.logger, obs);
  });
}

/**
 * Resolve destroy promise which will notify `port` that it should
 * cleanup and stop execution.
 * @param  {Process} proc
 */
function stopPorts(proc) {
  if (proc.destroyResolve) {
    proc.destroyResolve();
    proc.destroyResolve = null;
    proc.destroyPromise = null;
  }
}

/**
 * Map children model fields which have associated
 * logic in `children` function of the logic using given
 * iterator function.
 * Returns a Promise which resolves with a list with data
 * returned by each call to iterator function.
 * @param  {Process} proc
 * @param  {Object} model
 * @param  {Function} iterator
 * @param  {Array} iterKeys
 * @return {Promise}
 */
function forEachChildren(proc, model, iterator, iterKeys) {
  const { config } = proc;
  if (!iterator || !config.children) return;

  const childrenKeys = iterKeys || config.childrenKeys || EMPTY_ARRAY;
  const childRunner = (childModel, k) => iterator(childModel, k);
  const keyIterator = k => {
    if (config.children[k]) {
      maybeForEach(model[k], x => childRunner(x, k));
    }
  };

  maybeForEach(childrenKeys, keyIterator);
}

/**
 * Cancel all executing tasks of the process
 * @param  {Process} proc
 */
function cancelAllTasks(proc) {
  for (const taskId in proc.tasks) {
    cancelTask(proc, taskId);
  }
}

/**
 * Execute given task object in scope of given Process.
 * Returns a Promise which will be resolved when task will
 * be resolved or reject with with a command, which should
 * be executed next.
 * @param  {Process} proc
 * @param  {Task} taskObj
 * @return {Promise}
 */
function execTask(proc, taskObj, cmd) {
  const execId = nextId();
  const taskId = cmd.id;
  const { tasks, logger, model, sharedModel, config } = proc;
  const {
    task,
    executor,
    notifyCmd,
    successCmd,
    failCmd,
    customArgs,
    execEvery
  } = taskObj;

  // If not in multi-thread mode – cancel all running task with
  // same identifier (command id)
  if (!execEvery) {
    cancelTask(proc, taskId);
  }

  // Handle result of the execution of a task – returns
  // success command if error not defined, fail command otherwise
  const handleResult = ({ result, error }) => {
    if (tasks[taskId]) {
      delete tasks[taskId][execId];
    }
    if (error) {
      if (error.cancelled) {
        return new Command(null, null, `${cmd.funcName}.Cancelled`, true);
      } else {
        const actualFailCmd = failCmd && failCmd.appendArgs([error]);
        if (!actualFailCmd) logger.onCatchError(error);
        return actualFailCmd;
      }
    } else {
      const actualSuccessCmd = successCmd && successCmd.appendArgs([result]);
      return actualSuccessCmd;
    }
  };

  // Run notify command if presented
  const handleNotify = (...args) => {
    if (notifyCmd) {
      proc.exec(notifyCmd.appendArgs(args));
    };
  };

  // Run the task function and wait for the result
  const props = { model, meta: config.meta, shared: sharedModel };
  const context = { notify: handleNotify };
  const args = customArgs || cmd.args || EMPTY_ARRAY;
  const taskCall = executor.call(context, task, props, ...args);

  // Track task execution
  tasks[taskId] = tasks[taskId] || {};
  tasks[taskId][execId] = taskCall;

  return taskCall.exec().then(handleResult, handleResult);
}

/**
 * Compare model with update object and returns true
 * if update object do not have anything new.
 * @param  {Object}  model
 * @param  {Object}  update
 * @return {Boolean}
 */
function isShallowEqual(model, update) {
  for (let key in update) {
    if (is.array(model[key]) && is.array(update[key])) {
      if (model[key].length !== update[key].length) {
        return false;
      }
      for (let i = 0; i < model[key].length; i++) {
        if (model[key][i] !== update[key][i]) {
          return false;
        }
      }
    } else if (model[key] !== update[key]) {
      return false;
    }
  }
  return true;
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
function updateModel(proc, updateObj) {
  if (!updateObj || isShallowEqual(proc.model, updateObj)) {
    return false;
  }

  const tick = nextId();
  const updateKeys = Object.keys(updateObj);
  const { model } = proc;
  let rebindComputed = false;

  const updateMarker = (childModel, fieldName) => {
    if (bindChild(proc, childModel, fieldName)) {
      rebindComputed = true;
      procOf(childModel).run();
    }
    procOf(childModel).tick = tick;
  };

  const unmarkedDestroyer = childModel => {
    const childProc = procOf(childModel);
    if (childProc.tick !== tick) {
      rebindComputed = true;
      childProc.destroy();
    }
  };

  // Go throught all children models and mark which one
  // created and removed
  forEachChildren(proc, updateObj, updateMarker);
  forEachChildren(proc, model, unmarkedDestroyer, updateKeys);
  extend(model, updateObj);

  // Computed field may depend on child model, and when child
  // model destroyed/created we should reflect it in computed fields
  // Otherwise just reset all computed fields
  if (rebindComputed) {
    bindComputed(proc);
  } else {
    maybeForEach(proc.computedFields, f => f.reset());
  }
  return true;
}

/**
 * Run all parent handler from parent processes to handle
 * executed command. Returns a promise which will be resolved
 * when all handlers will be fully executed.
 * @param  {Object} model
 * @param  {Object} cmd
 * @return {Promise}
 */
function handleCommand(proc, cmd, isAfter) {
  if (!cmd.handlable) return;
  const { logger } = proc;
  const type = isAfter ? 'hubAfter' : 'hubBefore';
  logger.onStartHandling(cmd, isAfter);

  // Get all commands from all defined hubs
  const cmds = mapParents(proc, function maybeExecHub(parnetProc) {
    if (parnetProc.logic[type]) {
      return safeExecFunction(logger, function safeExecHub() {
        return parnetProc.logic[type](cmd);
      });
    }
  });

  // Exec all commands in defined order
  deepForEach(cmds, c => proc.exec(c));
  logger.onEndHandling(cmd, isAfter);
}

/**
 * Actually execute the command. It iis running "before" handler,
 * then command itself, then "after" handlers and then emit
 * "update" event on the process if model was updated.
 * Returns a promise which will be resolved when a command
 * will be fully executed (command + all handlers).
 *
 * @param  {Object} cmd
 */
function doExecCmd(proc, rawCmd) {
  const { logger, exec } = proc;
  const cmd = !rawCmd.logic ? rawCmd.bind(proc.logic) : rawCmd;
  let modelUpdated = null;

  // Prepare and run before handlers
  incExecCounter();
  logger.onStartExec(cmd);
  handleCommand(proc, cmd, false);

  // Execute command
  const safeExecCmd = () => cmd.exec();
  const result = safeExecFunction(logger, safeExecCmd, cmd);
  if (result) {
    if (result instanceof Task) {
      const taskPromise = execTask(proc, result, cmd);
      taskPromise.then(exec, exec);
    } else if (result && (is.array(result) || (result.func && result.id))) {
      deepForEach(result, x => exec(x));
    } else if (is.object(result)) {
      modelUpdated = updateModel(proc, result);
    }
  }

  // Emit model update for view re-rendering
  if (modelUpdated) {
    runAllObservers(proc);
  }

  // Run after handlers
  logger.onExecuted(cmd, result);
  handleCommand(proc, cmd, true);

  logger.onEndExec(cmd, result);
  decExecCounter();
}


/**
 * Handle delayed command execution. Decide when to execute the
 * command and when delay it, etc.
 * @param  {Process} proc
 * @param  {Command} cmd
 */
function doDelayExecCmd(proc, cmd) {
  const { tasks } = proc;
  const taskId = cmd.id;
  const tasksObj = tasks[taskId] = tasks[taskId] || {};

  let taskObj = tasksObj[DELAY_TASK];
  if (!taskObj) {
    const executor = doExecCmd.bind(null, proc);
    const cleanup = () => delete tasksObj[DELAY_TASK];
    taskObj = tasksObj[DELAY_TASK] = new DelayedExec(executor, cleanup, cmd.options);
  }

  taskObj.exec(cmd);
}


/**
 * Main logic execution class
 */
export function Process(opts) {
  const { parent, sharedModel, logger, logic, configArgs, context } = opts;
  this.id = nextId();
  this.logicClass = logic;
  this.parent = parent;
  this.sharedModel = sharedModel;
  this.context = context || {};
  this.logger = logger || new DefaultLogger();
  this.configArgs = configArgs || EMPTY_ARRAY;
  this.computedFields = EMPTY_ARRAY;
  this.destroyPromise = new Promise(r => (this.destroyResolve = r));
  this.tasks = {};
  this.observers = [];
  this.exec = this.exec.bind(this);
}

extend(Process.prototype, {
  /**
   * Bind given model to a process instance and appropreate
   * logic instance.
   * @param  {Object} model
   */
  bind(model) {
    prepareConfig(this);
    bindModel(this, model);
    bindChildren(this);
    bindComputed(this);
  },

  /**
   * Run the process – run children processes, then run port and
   * init commands defined in config.
   * Returns a Promise which resolves when all commands will be
   * executed.
   * @return {Promise}
   */
  run() {
    runChildren(this);
    runPorts(this);
    runInitCommands(this);
    runAllObservers(this);
  },

  /**
   * Destroy the process with unbinding from the model and cleaning
   * up all the parts of the process (stop ports, computed
   * fields).
   * @param  {Boolean} deep If true then all children blocks will be destroyed
   */
  destroy(deep) {
    delete this.model.__proc;
    this.observers = [];
    this.throttles = {};
    this.tasks = {};
    this.destroyed = true;

    stopPorts(this);
    stopComputedObservers(this);
    cancelAllTasks(this);

    if (deep !== false) {
      const childDestroyer = x => procOf(x).destroy(true);
      forEachChildren(this, this.model, childDestroyer);
    }
  },

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
   */
  exec(cmd) {
    if (!cmd || this.destroyed) return;

    // Create result promise and get active model
    const realCmd = ensureCommand(cmd);
    const cmdModel = realCmd.model || this.model;
    const modelProc = procOf(cmdModel, true);

    // Execute in current proc or in binded different proc
    if (modelProc) {
      if (modelProc.model !== this.model) {
        modelProc.exec(realCmd);
      } else {
        const opts = realCmd.options;
        if (opts.debounce > 0 || opts.throttle > 0) {
          doDelayExecCmd(this, realCmd)
        } else {
          doExecCmd(this, realCmd);
        }
      }
    }
  },

  /**
   * Returns a promise which will be resolved when all async
   * tasks and related handlers in the process and all children
   * processes will be finished.
   * @return {Promise}
   */
  finished() {
    const promises = [];
    for (let taskId in this.tasks) {
      for (let execId in this.tasks[taskId]) {
        const execution = this.tasks[taskId][execId].execution;
        if (execution) {
          promises.push(execution);
        }
      }
    }

    forEachChildren(this, this.model, function iterateChildren(childModel, fieldName) {
      const proc = procOf(childModel, true);
      if (proc) {
        const childFinished = proc.finished();
        if (childFinished && childFinished !== EMPTY_FINISHED) {
          promises.push(proc.finished());
        }
      }
    });

    return promises.length
      ? Promise.all(promises).then(() => this.finished())
      : EMPTY_FINISHED;
  }
});

export default Process;
