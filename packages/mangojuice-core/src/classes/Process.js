import Task from './Task';
import Command from './Command';
import DefaultLogger from './DefaultLogger';
import ensureCommand from '../core/cmd/ensureCommand';
import createCmd from '../core/cmd/cmd';
import observe from '../core/logic/observe';
import procOf from '../core/logic/procOf';
import delay from '../core/task/delay';
import { cancelTask } from '../core/cmd/cancel';
import {
  nextId,
  createResultPromise,
  is,
  maybeMap,
  maybeForEach,
  memoize,
  noop,
  fastTry,
  extend,
  deepMap
} from '../core/utils';

// Constants
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

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
  mapChildren(proc, proc.model, (childModel, fieldName) => {
    bindChild(proc, childModel, fieldName);
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
  const { logic, logger } = proc;
  let computedFields = EMPTY_ARRAY;

  if (logic.computed) {
    const ownComputedFields = safeExecFunction(logger, null, () =>
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
    const destroyHandler = () => bindComputed(proc);
    const updateHandler = () => {
      get.reset();
      runModelObservers(proc);
    };
    maybeForEach(computeVal.deps, m => {
      observe(m, proc.destroyPromise, updateHandler, destroyHandler);
    });
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
 * hidden `__proc` field in the model. Also set model, shared model
 * and meta in the logic instance.
 * @param  {Process} proc
 * @param  {Object} model
 */
function bindModel(proc, model) {
  const { logic, config: { meta }, sharedModel } = proc;
  proc.model = model;
  logic.model = model;
  logic.shared = sharedModel;
  logic.meta = meta;

  Object.defineProperty(model, '__proc', {
    value: proc,
    enumerable: false,
    configurable: true
  });

  bindShared(proc, sharedModel);
}

/**
 * Run given func with tracking `exec` (sync) calls. Rerutns a
 * Promise which will be resolved when all `exec` will be finished.
 * If execs tracking is already activated just use already active tracker.
 * @param  {Process} proc
 * @param  {Function} func
 * @return {Promise}
 */
function trackExecs(proc, func) {
  const newTracker = !proc.execPromise;
  proc.execPromise = proc.execPromise || createResultPromise();
  proc.execPromise.add(safeExecFunction(proc.logger, null, func));
  const res = proc.execPromise.get();
  if (newTracker) {
    proc.execPromise = null;
  }
  return res;
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
  return mapChildren(proc, proc.model, childRunner);
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
    const portRunner = () => logic.port(exec, destroyPromise);
    return trackExecs(proc, portRunner);
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
    return Promise.all(maybeMap(initCommands, cmd => exec(cmd)));
  }
}

/**
 * Ren all model observers and returns a Promise which will
 * be resolved when all handlers executed and returned promises
 * is also resolved
 * @param  {Process} proc
 * @return {Promise}
 */
function runModelObservers(proc) {
  return Promise.all(
    maybeMap(proc.observers, function observersIterator(obs) {
      return safeExecFunction(proc.logger, null, obs);
    })
  );
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
function mapChildren(proc, model, iterator, iterKeys) {
  const { config } = proc;
  if (!iterator || !config.children) {
    return Promise.resolve();
  }

  const resPromise = createResultPromise();
  const childrenKeys = iterKeys || config.childrenKeys || EMPTY_ARRAY;
  const childRunner = (childModel, k) => {
    resPromise.add(iterator(childModel, k));
  };
  const keyIterator = k =>
    config.children[k] && maybeForEach(model[k], x => childRunner(x, k));

  maybeForEach(childrenKeys, keyIterator);
  return resPromise.get();
}

/**
 * Execute some function in try/catch and if some error
 * accured print it to console and call logger function.
 * Returns result of function execution or null.
 * @param  {Function}    func
 * @return {any}
 */
function safeExecFunction(logger, cmd, func) {
  const { result, error } = fastTry(func);
  if (error) {
    logger.onCatchError(error, cmd);
  }
  return result;
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
  const { tasks, logger, model, sharedModel } = proc;
  const {
    task,
    executor,
    successCmd,
    failCmd,
    customArgs,
    execEvery
  } = taskObj;

  if (!execEvery) {
    cancelTask(proc, taskId);
  }

  const doExecTask = (resolve, reject) => {
    const handleResult = ({ result, error }) => {
      if (tasks[taskId]) {
        delete tasks[taskId][execId];
      }
      if (error) {
        if (error.cancelled) {
          reject(new Command(null, null, `${cmd.funcName}.Cancelled`, true));
        } else {
          const actualFailCmd = failCmd && failCmd.appendArgs([error]);
          if (!actualFailCmd) logger.onCatchError(error);
          reject(actualFailCmd);
        }
      } else {
        const actualSuccessCmd = successCmd && successCmd.appendArgs([result]);
        resolve(actualSuccessCmd);
      }
    };

    const res = fastTry(() => {
      const props = { model, shared: sharedModel };
      const taskProc = executor(task, props, ...(customArgs || cmd.args));
      taskProc.then(handleResult, handleResult);
      return taskProc;
    });

    if (res.error) {
      handleResult(res);
    }

    tasks[taskId] = tasks[taskId] || {};
    tasks[taskId][execId] = res.result;
  };

  const nextTickExecTask = (resolve, reject) => {
    delay(0).then(doExecTask.bind(null, resolve, reject));
  };

  return new Promise(nextTickExecTask);
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
  if (!updateObj) return false;

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
  mapChildren(proc, updateObj, updateMarker);
  mapChildren(proc, model, unmarkedDestroyer, updateKeys);
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
      return safeExecFunction(logger, null, function safeExecHub() {
        return parnetProc.logic[type](cmd);
      });
    }
  });

  // Exec all commands in defined order
  const execs = deepMap(cmds, c => proc.exec(c));

  logger.onEndHandling(cmd, isAfter);
  return Promise.all(execs);
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
  const resPromise = createResultPromise();
  const cmd = !rawCmd.logic ? rawCmd.bind(proc.logic) : rawCmd;
  let modelUpdated = false;

  // Prepare and run before handlers
  logger.onStartExec(cmd);
  resPromise.add(handleCommand(proc, cmd, false));

  // Execute command
  const safeExecCmd = () => cmd.exec();
  const result = safeExecFunction(logger, cmd, safeExecCmd);
  if (result) {
    if (result instanceof Task) {
      const taskPromise = execTask(proc, result, cmd);
      resPromise.add(taskPromise.then(exec, exec));
    } else if (result && (is.array(result) || (result.func && result.id))) {
      resPromise.add(Promise.all(deepMap(result, x => exec(x))));
    } else if (is.object(result)) {
      modelUpdated = updateModel(proc, result);
    }
  }

  // Run after handlers
  logger.onExecuted(cmd, result);
  resPromise.add(handleCommand(proc, cmd, true));

  // Emit model update for view re-rendering
  if (modelUpdated) {
    resPromise.add(runModelObservers(proc));
  }

  logger.onEndExec(cmd, result);
  return resPromise.get();
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
    const resPromise = createResultPromise();
    resPromise.add(runChildren(this));
    resPromise.add(runPorts(this));
    resPromise.add(runInitCommands(this));
    resPromise.add(runModelObservers(this));
    return resPromise.get();
  },

  /**
   * Destroy the process with unbinding from the model and cleaning
   * up all the parts of the process (stop ports, computed
   * fields).
   * @param  {Boolean} deep If true then all children blocks will be destroyed
   */
  destroy(deep) {
    delete this.model.__proc;
    stopPorts(this);
    cancelAllTasks(this);
    this.observers = null;
    this.throttles = null;
    this.tasks = null;
    this.destroyed = true;

    if (deep !== false) {
      const childDestroyer = x => procOf(x).destroy(true);
      mapChildren(this, this.model, childDestroyer);
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
   * @return {Promise}
   */
  exec(cmd) {
    if (!cmd || this.destroyed) {
      return Promise.resolve();
    }

    // Create result promise and get active model
    const realCmd = ensureCommand(cmd);
    const cmdModel = realCmd.model || this.model;
    const modelProc = procOf(cmdModel, true);

    // Execute in current proc or in binded different proc
    let result;
    if (modelProc) {
      if (modelProc.model !== this.model) {
        result = modelProc.exec(realCmd);
      } else {
        result = doExecCmd(this, realCmd);
      }
    }

    // Add result to active exec tracker if defined
    if (this.execPromise && result) {
      this.execPromise.add(result);
    }

    return result;
  }
});

export default Process;
