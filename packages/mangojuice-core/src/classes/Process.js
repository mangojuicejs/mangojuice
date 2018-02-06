import TaskMeta from './TaskMeta';
import Event from './Event';
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
 * Iterate through all active child models with
 * attached logic and run given iterator for every model.
 * @param  {Process} proc
 */
function forEachChildren(proc, iterator) {
  for (let id in proc.children) {
    iterator(proc.children[id]);
  }
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
function bindChild(proc, model, key, childDef, tick) {
  const logicClass = is.func(childDef) ? childDef : childDef.logicClass;
  const configArgs = is.func(childDef) ? EMPTY_ARRAY : childDef.args;
  const currModel = model[key] = model[key] || {};
  let currProc = procOf(currModel, true);
  let procCreated = false;

  // Re-run prepare with new config args if proc already running
  // with the same logic class, otherwise destroy the logic
  if (currProc) {
    if (currProc.logic instanceof logicClass) {
      currProc.exec(() => currProc.logic.prepare.apply(currProc.logic, configArgs));
    } else {
      currProc.destroy();
      currProc = null;
    }
  }

  // Run new process for given child definition if no proc was
  // binded to the model or if it was destroyed
  if (!currProc) {
    currProc = new proc.constructor({
      configArgs,
      logic: logicClass,
      parent: proc,
      context: proc.context,
      sharedModel: proc.childShared || proc.sharedModel,
      logger: proc.logger
    });
    currProc.bind(currModel);
    currProc.run();
    procCreated = true;
  }

  proc.children[currProc.id] = currProc;
  return procCreated;
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
function bindComputedField(proc, model, key, computeVal) {
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

  Object.defineProperty(model, key, {
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
  proc.model = model || {};
  Object.defineProperty(model, '__proc', {
    value: proc,
    enumerable: false,
    configurable: true
  });
}

/**
 * Run init command depending on from what state the logic
 * is runinng. Run `logic.rehydrate` if some model was provided
 * and `prepare` if model was not provided and we need to create
 * it from scratch.
 * @param  {Process} proc
 */
function runInitCommand(proc) {
  // Run prepare command for the model
  const { exec, logic, configArgs, logger, sharedModel } = proc;
  const commandFactory = () => logic.prepare(...configArgs);
  exec(commandFactory);

  // Create children context if needed
  if (logic.context) {
    const safeCreateContext = () => logic.context();
    const adjContext = safeExecFunction(logger, safeCreateContext);
    proc.childShared = { ...sharedModel, ...adjContext };
  }
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
  const { tasks, logger, model, sharedModel, config, logic } = proc;
  const { task, executor, notifyCmd, successCmd, failCmd,
    customArgs, execEvery } = taskObj;

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
    if (error && !error.cancelled) {
      return failCmd
        ? () => failCmd.call(logic, error)
        : logger.onCatchError(error);
    } else if (successCmd) {
      return () => successCmd.call(logic, result);
    }
  };

  // Run notify command if presented
  const handleNotify = (...args) => {
    if (notifyCmd) {
      proc.exec(() => notifyCmd.apply(logic, args));
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

function updateModelField(proc, model, key, update, deep) {
  if (update instanceof ChildLogic) {
    bindChild(proc, model, key, update);
    return false;
  } else if (update instanceof ComputedField || is.func(update)) {
    bindComputedField(proc, model, key, update);
  } else if (is.object(update) && deep < 2) {
    const nextModel = model[key] = model[key] || {};
    for (let nextKey in update) {
      doUpdateModel(proc, nextModel, nextKey, update[nextKey], deep + 1);
    }
  } else if (is.array(update) && deep < 2) {
    const nextModel = model[key] = model[key] || [];
    fastForEach(update, (nextUpdate, nextKey) => {
      doUpdateModel(proc, nextModel, nextKey, nextUpdate, deep + 1);
    });
  } else {
    const currProc = procOf(model[key], true);
    if (currProc) currProc.destroy();
    if (model[key] === update) return false;
    model[key] = update;
  }
  return true;
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
  let modelUpdated = false;

  fastForEach(Object.keys(updateObj), (k) => {
    const res = updateModelField(proc, proc.model, k, updateObj[k], 0);
    modelUpdated = modelUpdated || res;
  });

  if (modelUpdated) {
    maybeForEach(proc.computedFields, (f) => f.reset());
  }

  return modelUpdated;
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
function doExecCmd(proc, cmd) {
  const { logger, exec } = proc;
  let modelUpdated = false;

  // Prepare and run before handlers
  incExecCounter();
  logger.onStartExec(cmd);

  // Execute command
  if (cmd instanceof TaskMeta) {
    const taskPromise = execTask(proc, cmd);
    taskPromise.then(exec, exec);
  } else if (cmd instanceof Event) {
    // TODO
  } else if (cmd && (is.array(cmd) || is.func(cmd))) {
    forEach(cmd, x => exec(x));
  } else if (is.object(cmd)) {
    modelUpdated = updateModel(proc, cmd);
  }

  // Emit model update for view re-rendering
  if (modelUpdated) {
    runAllObservers(proc);
  }

  // Run after handlers
  logger.onExecuted(cmd);
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
  this.logic = new logic();
  this.parent = parent;
  this.sharedModel = sharedModel;
  this.context = context || {};
  this.logger = logger || new DefaultLogger();
  this.configArgs = configArgs || EMPTY_ARRAY;
  this.computedFields = EMPTY_ARRAY;
  this.destroyPromise = new Promise(r => (this.destroyResolve = r));
  this.tasks = {};
  this.observers = [];
  this.children = {};
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
    bindModel(this, model);
  },

  /**
   * Run the process – run children processes, then run port and
   * init commands defined in config.
   * Also run all model observers created by {@link observe}
   */
  run() {
    runInitCommand(this);
    runPorts(this);
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
    this.observers = [];
    this.destroyed = true;

    delete this.model.__proc;
    if (this.parent) {
      delete this.parent.children[this.id];
    }

    stopPorts(this);
    stopComputedObservers(this);
    cancelAllTasks(this);

    if (deep !== false) {
      const childDestroyer = proc => proc.destroy(true);
      forEachChildren(this, childDestroyer);
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

    if (is.func(cmd)) {
      const safeCommandCreate = () => cmd.call(this.logic);
      const nextCommand = safeExecFunction(this.logger, safeCommandCreate);
      return this.exec(nextCommand);
    }

    doExecCmd(this, cmd);

    // const opts = realCmd.options;
    // if (opts.debounce > 0 || opts.throttle > 0) {
    //   doDelayExecCmd(this, cmd)
    // } else {
    //   doExecCmd(this, cmd);
    // }
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

    forEachChildren(this, function iterateChildren(proc) {
      const childFinished = proc.finished();
      if (childFinished !== EMPTY_FINISHED) {
        promises.push(childFinished);
      }
    });

    return promises.length
      ? Promise.all(promises).then(() => this.finished())
      : EMPTY_FINISHED;
  }
});

export default Process;
