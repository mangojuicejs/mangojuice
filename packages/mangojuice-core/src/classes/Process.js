import Task from './Task';
import Command from './Command';
import DefaultLogger from './DefaultLogger';
import EventEmitter from './EventEmitter';
import ensureCommand from '../core/cmd/ensureCommand';
import handleModelOf from '../core/logic/handleModelOf';
import procOf from '../core/logic/procOf';
import delay from '../core/task/delay';
import { cancelTask } from '../core/cmd/cancel';
import {
  MODEL_UPDATED_EVENT, DESTROY_MODEL_EVENT, CMD_EXEC_EVENT
} from '../core/logic/constants';
import {
  nextId, createResultPromise, is, maybeMap,
  maybeForEach, emptyArray, memoize, noop, fastTry,
  extend
} from "../core/utils";


/**
 * Default command used for emiting model updated event
 * when command is not provided.
 * @type {Command}
 */
const MODEL_UPD_CMD = new Command(null, null, 'ModelUpdated');

/**
 * Run `children` and `config` methods of the logic object
 * and create `config` object in the Process based on the result.
 */
function prepareConfig(proc) {
  const { logic, configArgs } = proc
  let config = { children: {}, childrenKeys: [], meta: {} };
  config = (logic.config && logic.config(...configArgs)) || {};
  config.meta = config.meta || {};
  proc.config = config;

  if (logic.children) {
    config.children = logic.children() || {};
    config.childrenKeys = Object.keys(config.children);
  }
}

/**
 * Go from current proc to the root of the proc tree
 * and run iterator function if handler of given type
 * exists in the process instance.
 * @param  {Process} proc
 * @param  {string} type
 * @param  {function} iterator
 */
function iterateHandlers(proc, type, iterator) {
  let currParent = proc.parent;
  let currHandler = proc[type];
  while (currParent) {
    if (currHandler) {
      iterator(currParent, currHandler);
    }
    currHandler = currParent[type];
    currParent = currParent.parent;
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
    const subProc = new Process({
      ...proc.config.children[fieldName],
      parent: proc,
      sharedModel: proc.sharedModel,
      logger: proc.logger,
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
  let computedFields = emptyArray;

  if (logic.computed) {
    const ownComputedFields = safeExecFunction(logger, null, () => logic.computed());
    if (ownComputedFields) {
      const computedFieldBinder = k => bindComputedField(proc, k, ownComputedFields[k]);
      computedFields = maybeMap(Object.keys(ownComputedFields), computedFieldBinder);
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
      proc.emitModelUpdate();
    };
    maybeForEach(computeVal.deps, m => {
      handleModelOf(m, proc.destroyPromise, updateHandler, destroyHandler);
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

  Object.defineProperty(model, "__proc", {
    value: proc,
    enumerable: false,
    configurable: true
  });
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
  const childRunner = (childModel) => procOf(childModel).run();
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
    const portProps = { exec, destroy: destroyPromise };
    const portRunner = () => logic.port(portProps);
    const result = safeExecFunction(logger, null, portRunner);
    return Promise.resolve(result);
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
  const childrenKeys = iterKeys || config.childrenKeys || emptyArray;
  const childRunner = (childModel, k) => {
    resPromise.add(iterator(childModel, k));
  };
  const keyIterator = k => (
    config.children[k] &&
    maybeForEach(model[k], x => childRunner(x, k))
  );

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
function executeTask(proc, taskObj, cmd) {
  const execId = nextId();
  const taskId = cmd.id;
  const { tasks, logger, model, shared } = proc;
  const { task, executor, successCmd, failCmd,
    customArgs, execEvery } = taskObj;

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
          reject(new Command(null, null, `${cmd.funcName}.Cancelled`));
        } else {
          const actualFailCmd = failCmd && failCmd.clone().appendArgs([error]);
          if (!actualFailCmd) logger.onCatchError(error);
          reject(actualFailCmd);
        }
      } else {
        const actualSuccessCmd = successCmd && successCmd.clone().appendArgs([result]);
        resolve(actualSuccessCmd);
      }
    };

    const res = fastTry(() => {
      const props = { model, shared };
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

  const unmarkedDestroyer = (childModel) => {
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
function handleCommand(proc, cmd, isBefore) {
  const { logger } = proc;
  const type = isBefore ? 'beforeCmd' : 'afterCmd';
  const resPromise = createResultPromise();

  logger.onStartHandling(cmd, isBefore);
  iterateHandlers(proc, type, (handlerProc, handler) => {
    const handlerCmd = handler.clone().appendArgs([cmd]);
    handlerCmd.isHandler = true;
    const execRes = handlerProc.exec(handlerCmd);
    resPromise.add(execRes);
  })
  logger.onEndHandling(cmd, isBefore);

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
function doExecCmd(proc, cmd) {
  const { logger, exec } = proc;
  const resPromise = createResultPromise();
  let modelUpdated = false;

  // Prepare and run before handlers
  cmd.bind(proc.logic);
  logger.onStartExec(cmd);
  resPromise.add(handleCommand(proc, cmd, true));

  // Execute command
  const safeExecCmd = () => cmd.exec();
  const result = safeExecFunction(logger, cmd, safeExecCmd);
  if (result) {
    if (result instanceof Task) {
      const taskPromise = executeTask(proc, result, cmd);
      resPromise.add(taskPromise.then(exec, exec));
    } else if (is.array(result) || result instanceof Command) {
      const batchRes = maybeMap(result, x => exec(x));
      resPromise.add(Promise.all(batchRes));
    } else if (is.object(result)) {
      modelUpdated = updateModel(proc, result);
    }
  }
  logger.onExecuted(cmd, result);

  // Run after handler and notify handlers
  resPromise.add(handleCommand(proc, cmd, false));
  resPromise.add(proc.emit(CMD_EXEC_EVENT, cmd));
  if (modelUpdated) {
    resPromise.add(proc.emitModelUpdate(cmd));
  }

  logger.onEndExec(cmd, result);
  return resPromise.get();
}


/**
 * Main logic execution class
 */
export function Process({
  parent,
  sharedModel,
  beforeCmd,
  afterCmd,
  logger,
  logic,
  configArgs
}) {
  this.id = nextId();
  this.logic = new logic();
  this.parent = parent;
  this.sharedModel = sharedModel;
  this.beforeCmd = ensureCommand(beforeCmd);
  this.afterCmd = ensureCommand(afterCmd);
  this.logger = logger || new DefaultLogger();
  this.configArgs = configArgs || emptyArray;
  this.destroyPromise = new Promise(r => this.destroyResolve = r);
  this.tasks = {};
  this.exec = this.exec.bind(this);
}

extend(Process.prototype, EventEmitter.prototype);
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
    this.emit(DESTROY_MODEL_EVENT);
    this.events = null;

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
    if (!cmd) return Promise.resolve();

    const realCmd = ensureCommand(cmd);
    const cmdModel = realCmd.model || this.model;
    const modelProc = procOf(cmdModel, true);

    if (modelProc) {
      if (modelProc.model !== this.model) {
        return modelProc.exec(realCmd);
      }
      return doExecCmd(this, realCmd);
    }

    return Promise.resolve();
  },

  /**
   * Emit an event that notify subscribers that the model attached
   * to the process updated. It is usually re-denred appropreate View.
   * @param  {?Command} cmd
   * @return {Promise}
   */
  emitModelUpdate(cmd) {
    const finalCmd = cmd || MODEL_UPD_CMD;
    return this.emit(MODEL_UPDATED_EVENT, finalCmd)
  }
});

export default Process;
