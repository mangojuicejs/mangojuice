import TaskMeta from './TaskMeta';
import Command from './Command';
import ThrottleTask from './ThrottleTask';
import DefaultLogger from './DefaultLogger';
import ensureCommand from '../core/cmd/ensureCommand';
import createCmd from '../core/cmd/cmd';
import observe, { incExecCounter, decExecCounter } from '../core/logic/observe';
import procOf from '../core/logic/procOf';
import delay from '../core/task/delay';
import { cancelTask, cancelAllTasks } from '../core/cmd/cancel';
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
 *
 * @private
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
 *
 * @private
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
 * @private
 */
function prepareConfig(proc) {
  const { logicClass, configArgs, logger } = proc;
  let config = { children: EMPTY_OBJECT, childrenKeys: EMPTY_ARRAY, meta: {} };
  const logic = new logicClass();
  proc.logic = logic;

  const safeExecConfig = () => logic.config && logic.config(...configArgs);
  const configRes = safeExecFunction(logger, safeExecConfig);

  config = configRes || config;
  config.meta = config.meta || {};
  logic.meta = config.meta;
  proc.config = config;
}

/**
 * Create process and bind the process to child model
 * with given name. If model field is empty then do nothing.
 * If model already binded to some model do nothing.
 * Return true if model sucessfully binded to the process.
 * Othersise returns false
 *
 * @private
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
 *
 * @private
 * @param  {Process} proc
 */
function bindChildren(proc) {
  const { logic, logger, config } = proc;
  if (logic.children) {
    const safeExecChildren = () => logic.children();
    config.children = safeExecFunction(logger, safeExecChildren) || {};
    config.childrenKeys = Object.keys(config.children);
  }

  const iterateChildren = (model, field) => bindChild(proc, model, field);
  forEachChildren(proc, proc.model, iterateChildren);
}

/**
 * Stop all running observers for all existing computed fields
 *
 * @private
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
 * @private
 */
function bindComputed(proc) {
  if (proc.destroyed) return;

  const { logic, logger } = proc;
  let computedFields = EMPTY_ARRAY;
  stopComputedObservers(proc);

  if (logic.computed) {
    const safeExecComputed = () => logic.computed();
    const ownComputedFields = safeExecFunction(logger, safeExecComputed);

    if (ownComputedFields) {
      const fieldBinder = (k) => bindComputedField(proc, k, ownComputedFields[k]);
      computedFields = maybeMap(Object.keys(ownComputedFields), fieldBinder);
    }
  }

  proc.computedFields = computedFields;
}

/**
 * Bind field in the model with given computed function or dependency
 * object.
 *
 * @private
 * @param  {Process} proc
 * @param  {string} fieldName
 * @param  {function|ComputedField} computeVal
 * @return {Memoize}
 */
function bindComputedField(proc, fieldName, computeVal) {
  const { logger } = proc;
  let get = noop;

  if (is.func(computeVal)) {
    get = memoize(() => safeExecFunction(logger, computeVal));
  } else if (is.object(computeVal)) {
    const computeWithDeps = () => computeVal.computeFn(...computeVal.deps)
    get = memoize(() => safeExecFunction(logger, computeWithDeps));

    const updateHandler = () => {
      if (get.computed()) {
        get.reset();
        runAllObservers(proc);
      }
    };
    const observeDependency = (m) => observe(m, updateHandler);
    get.observers = maybeMap(computeVal.deps, observeDependency);
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
 * hidden `__proc` field in the model. Also set model and shared model,
 *
 * @private
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
}

/**
 * Itereate through all children models with logic assigned
 * and run binded process. Returns a Promise which will be
 * resolved when all inicialisation of all children logics
 * will be finished.
 *
 * @private
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
 *
 * @private
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
 *
 * @private
 * @param  {Process} proc
 * @return {Promise}
 */
function runInitCommands(proc) {
  const { config: { initCommands }, exec } = proc;
  if (initCommands) {
    const initCmdIterator = (cmd) => exec(cmd);
    maybeForEach(initCommands, initCmdIterator);
  }
}

/**
 * Ren all model observers and returns a Promise which will
 * be resolved when all handlers executed and returned promises
 * is also resolved
 *
 * @private
 * @param  {Process} proc
 * @return {Promise}
 */
function runAllObservers(proc) {
  const observersIterator = (obs) => obs();
  maybeForEach(proc.observers, observersIterator);
}

/**
 * Resolve destroy promise which will notify `port` that it should
 * cleanup and stop execution.
 *
 * @private
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
 *
 * @private
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
 * Execute given task object in scope of given Process.
 * Returns a Promise which will be resolved when task will
 * be resolved or reject with with a command, which should
 * be executed next.
 *
 * @private
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
        return new Command(null, null, `${cmd.funcName}.Cancelled`, { internal: true });
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
 * Update the binded model with update object passed as an argument.
 * Returns true when model was changed, otherwise returns false.
 * Also while updating process destryoy/create processes for
 * removed/added models.
 *
 * @private
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
 *
 * @private
 * @param  {Object} model
 * @param  {Object} cmd
 * @return {Promise}
 */
function handleCommand(proc, cmd, isAfter) {
  if (!cmd.handlable) return;
  const { logger } = proc;
  const logicFnName = isAfter ? 'hubAfter' : 'hubBefore';
  const handlersArr = isAfter ? proc.handlersAfter : proc.handlersBefore;
  logger.onStartHandling(cmd, isAfter);

  // Get all commands from all defined hubs
  const cmds = mapParents(proc, function maybeExecHub(parnetProc) {
    if (parnetProc.logic[logicFnName]) {
      const safeExecHub = () => parnetProc.logic[logicFnName](cmd);
      return safeExecFunction(logger, safeExecHub);
    }
  });

  // Exec all commands in defined order
  deepForEach(cmds, c => proc.exec(c));
  maybeForEach(handlersArr, handler => handler(cmd));
  logger.onEndHandling(cmd, isAfter);
}

/**
 * Actually execute the command. It iis running "before" handler,
 * then command itself, then "after" handlers and then emit
 * "update" event on the process if model was updated.
 * Returns a promise which will be resolved when a command
 * will be fully executed (command + all handlers).
 *
 * @private
 * @param  {Object} cmd
 */
function doExecCmd(proc, rawCmd) {
  const { logger, exec } = proc;
  const cmd = !rawCmd.logic ? rawCmd.bind(proc.logic) : rawCmd;
  let modelUpdated = false;

  // Prepare and run before handlers
  incExecCounter();
  logger.onStartExec(cmd);
  handleCommand(proc, cmd, false);

  // Execute command
  const safeExecCmd = () => cmd.exec();
  const result = safeExecFunction(logger, safeExecCmd, cmd);
  if (result) {
    if (result instanceof TaskMeta) {
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
  logger.onEndExec(cmd);
  decExecCounter();
}


/**
 * Handle delayed command execution. Decide when to execute the
 * command and when delay it, etc.
 *
 * @private
 * @param  {Process} proc
 * @param  {Command} cmd
 */
function doDelayExecCmd(proc, cmd) {
  const { tasks } = proc;
  const taskId = cmd.id;
  const tasksObj = tasks[taskId] = tasks[taskId] || {};

  let taskObj = tasksObj[DELAY_TASK];
  if (!taskObj) {
    const executor = (finalCmd) => doExecCmd(proc, finalCmd);
    const cleanup = () => delete tasksObj[DELAY_TASK];
    taskObj = tasksObj[DELAY_TASK] = new ThrottleTask(executor, cleanup, cmd.options);
  }

  taskObj.exec(cmd);
}

/**
 * The main class of MangoJuice that ties model, logic and view together.
 *
 * It works in the following way:
 * - You create a model for your app (object) using `createModel` of
 *   the root block. The result is a plain object.
 * - Then you need to create an instance of Process and pass logic class
 *   in the options object.
 * - Then you `bind` the Process instance to the model object you created on step one.
 *   "To bind Process to a model" means that in the model will be created a hidden
 *   field `__proc` with a reference to the Process instance.
 * - After that you can `run` the Process, which will execute init commands, port.
 *
 * `bind` and `run` also look at the object returned from {@link LogicBase#children}
 * and create/run Process instances for children models.
 *
 * Most of the time you do not need to care about all of these and just use
 * {@link run} and {@link mount}. These small functions do everything described
 * above for you.
 *
 * @class Process
 * @example
 * import { Process, logicOf } from 'mangojuice-core';
 *
 * const ExampleBlock = {
 *   createModel() {
 *     return { a: 10 };
 *   },
 *   Logic: class Example {
 *     \@cmd Increment(amount = 1) {
 *       return { a: this.model.a + amount };
 *     }
 *   }
 * };
 *
 * const model = ExampleBlock.createModel();
 * const proc = new Process({ logic: ExampleBlock.Logic });
 * proc.bind(model);
 * proc.run();
 * proc.exec(logicOf(model).Increment(23));
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
  this.handlersAfter = [];
  this.handlersBefore = [];
  this.exec = this.exec.bind(this);
}

extend(Process.prototype, /** @lends Process.prototype */{
  /**
   * Bind the process instance to a given model, which means that hidden
   * `__proc` field will be created in the model with a reference to the
   * Process instance.
   *
   * Also bind all children models – go through children definition returned
   * by {@link LogicBase#children}, create Process for each child and bind
   * it to an appropreat child model object.
   *
   * @param  {Object} model  A model object that you want to bind to the Process.
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
   * Also run all model observers created by {@link observe}
   */
  run() {
    runChildren(this);
    runPorts(this);
    runInitCommands(this);
    runAllObservers(this);
  },

  /**
   * Destroy the process with unbinding from the model and cleaning
   * up all the parts of the process (stop ports, computed fields).
   * `__proc` field will be removed from the model object and all
   * children objects.
   *
   * @param  {Boolean} deep   If true then all children blocks will be destroyed.
   *                          By default, if not provided then considered as true.
   */
  destroy(deep) {
    delete this.model.__proc;
    this.observers = [];
    this.handlersBefore = [];
    this.handlersAfter = [];
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
   * command. The command could be function (command factory)
   * or object ({@link Command} instance).
   *
   * A command origin function could return three types of things:
   * - Another {@link Command}/command factory or an array of commands
   *   (an element of the array also could be another array with commands
   *   or null/undefined/false). All commands will be execute in provided order.
   * - An instance of {@link TaskMeta} (which is usually created by {@link task}
   *   helper function). The returned task will be started and do not block
   *   execution of next commands in the stack.
   * - A plain object which is a model update object. The object will be merged
   *   with current model.
   *
   * If command is undefined or `Process` instance not binded
   * to any model it will do nothing.
   *
   * @example
   * class MyLogic {
   *   \@cmd BatchCommand() {
   *     return [
   *       1 > 2 && this.SomeCoomand,
   *       this.AnotheCommand(123),
   *       2 > 1 && [
   *         this.AndSomeOtherCommand,
   *         this.FinalCommand()
   *       ]
   *     ];
   *   }
   *   \@cmd TaskCommand() {
   *     return task(Tasks.SomeTask)
   *       .success(this.SuccessCommand)
   *       .fail(this.FailCommand)
   *   }
   *   \@cmd ModelUpdateCommand() {
   *     if (Math.random() > 0.6) {
   *       return { field: Date.now() };
   *     }
   *   }
   * }
   * @param  {Function|Object} cmd  Command factory or Command instance
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
        if (is.promise(execution)) {
          promises.push(execution);
        }
      }
    }

    forEachChildren(this, this.model, function iterateChildren(childModel, fieldName) {
      const proc = procOf(childModel, true);
      if (proc) {
        const childFinished = proc.finished();
        if (childFinished !== EMPTY_FINISHED) {
          promises.push(childFinished);
        }
      }
    });

    return promises.length
      ? Promise.all(promises).then(() => this.finished())
      : EMPTY_FINISHED;
  }
});

export default Process;
