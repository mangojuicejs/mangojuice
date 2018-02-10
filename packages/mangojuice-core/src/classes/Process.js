import TaskCmd from './TaskCmd';
import Message from './Message';
import ComputedFieldCmd from './ComputedFieldCmd';
import ContextCmd from './ContextCmd';
import ContextLogic from './ContextLogic';
import ChildCmd from './ChildCmd';
import ThrottleTask from './ThrottleTask';
import DefaultLogger from './DefaultLogger';
import observe, { incExecCounter, decExecCounter } from '../core/logic/observe';
import procOf from '../core/procOf';
import handle from '../core/handle';
import child from '../core/child';
import {
  nextId,
  is,
  maybeMap,
  maybeForEach,
  memoize,
  noop,
  fastTry,
  extend,
  fastForEach,
  safeExecFunction
} from '../core/utils';


// Constants
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const EMPTY_FINISHED = Promise.resolve();
const DELAY_TASK = 'DELAY';


/**
 * Iterate through all active processes in the app and
 * run given iterator for every process
 * @param  {Process} proc
 */
function forEachProcess(proc, iterator) {
  const { processes } = proc.context;
  for (let id in processes) {
    iterator(processes[id]);
  }
}

/**
 * Iterate through all active child processes and run
 * given iterator for every model.
 * @param  {Process} proc
 */
function forEachChildren(proc, iterator) {
  for (let id in proc.children) {
    iterator(proc.children[id]);
  }
}

function updateChildLogic(proc, model, childDef) {
  const { logicClass, updateMsg, createArgs } = childCmd;
  let currProc = procOf(model);

  // Protect update of the model of the same type
  if (updateMsg && !currProc) {
    throw new Error(`Child model "${key}" do not exists or have incorrect type`);
  }

  // Re-run prepare with new config args if proc already running
  // with the same logic class, otherwise destroy the logic
  if (currProc) {
    if (!updateMsg) {
      currProc.destroy();
      currProc = null;
    } else {
      runLogicUpdate(proc, updateMsg);
    }
  }

  // Run new process for given child definition if no proc was
  // binded to the model or if it was destroyed
  if (!currProc) {
    currProc = new proc.constructor({
      createArgs,
      logicClass,
      parent: proc,
      logger: proc.logger,
      contexts: proc.contexts,
      internalContext: proc.internalContext
    });
    currProc.bind(model);
    currProc.run();
    proc.children[currProc.id] = currProc;
  }

  return currProc;
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
function bindChild(proc, model, key, childCmd) {
  const currModel = model[key] = model[key] || {};
  return updateChildLogic(proc, currModel, childCmd);
}

/**
 * Bind field in the model with given computed function or dependency
 * object.
 *
 * @private
 * @param  {Process} proc
 * @param  {string} fieldName
 * @param  {function|ComputedFieldCmd} computeVal
 * @return {Memoize}
 */
function bindComputedFieldCmd(proc, model, key, computeVal) {
  const { logger } = proc;
  let get = noop;

  if (is.func(computeVal)) {
    get = memoize(() => safeExecFunction(logger, computeVal));
  } else if (computeVal instanceof ComputedFieldCmd) {
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
  proc.logic.model = proc.model;

  if (!model.__proc) {
    Object.defineProperty(model, '__proc', {
      value: proc,
      enumerable: false,
      configurable: true
    });
  }
}

function bindContext(proc, model, key, contextCmd) {
  const { contextFn, createArgs, id } = contextCmd;

  if (!proc.ownContext[id]) {
    const childDef = child(ContextLogic).create(contextFn, createArgs);
    bindChild(proc, model, key, childDef);
    proc.ownContext[id] = model[key];
  }
}

function bindParallelLogic(proc, childDef) {
  const childProc = updateChildLogic(proc, proc.model, childDef);
  if (childDef.createArgs) {
    proc.handlers.push((msg) => runLogicUpdate(childProc, msg));
    childProc.handlers.push((msg) => runLogicUpdate(proc, msg));
  }
}

/**
 * Run init command depending on from what state the logic
 * is runinng. Run `logic.rehydrate` if some model was provided
 * and `prepare` if model was not provided and we need to create
 * it from scratch.
 * @param  {Process} proc
 */
function runLogicFunc(proc, name, args) {
  const { exec, logic } = proc;
  const commandFactory = () => logic[name] && logic[name].apply(logic, args);
  exec(commandFactory);
}

function runLogicCreate(proc) {
  runLogicFunc(proc, 'create', proc.configArgs);
}

function runLogicUpdate(proc, msg) {
  runLogicFunc(proc, 'update', [msg]);
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

function destroyAllProcesses(model) {
  const currProc = procOf(x);
  if (currProc) {
    maybeForEach(currProc, p => p.destroy());
  }
}

function unsubscribeContexts(proc) {
  fastForEach(proc.contextSubs, u => u());
}

function findContext(proc, contextCmd) {
  const { contexts } = proc;
  const { id } = contextCmd;

  for (let i = 0; i < contexts.length; i++) {
    const ctx = contexts[i][id];
    if (ctx) return ctx;
  }

  return null;
}

/**
 * Cancel task with given id in the process if exists
 * and can be cancelled (have `cancel` function defined)
 *
 * @private
 * @param  {Process} proc
 * @param  {nubmer} id
 */
function cancelTask(proc, taskId) {
  const taskProcs = proc.tasks[taskId];
  delete proc.tasks[taskId];

  for (const execId in taskProcs) {
    const taskCall = taskProcs[execId];
    if (taskCall && taskCall.cancel) {
      taskCall.cancel();
    }
  }
}

/**
 * Cancel all executing tasks of the process
 *
 * @private
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
 *
 * @private
 * @param  {Process} proc
 * @param  {Task} taskObj
 * @return {Promise}
 */
function execTask(proc, taskObj) {
  const execId = nextId();
  const { tasks, logger, model, sharedModel, config, logic } = proc;
  const { task, executor, notifyCmd, successCmd, failCmd,
    customArgs, execEvery, id: taskId } = taskObj;

  // If not in multi-thread mode or just need to cancel a tak –
  // cancel all running task with same identifier (command id)
  if (taskObj.cancelTask || !execEvery) {
    cancelTask(proc, taskId);
    if (taskObj.cancelTask) return;
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
  const context = { notify: handleNotify };
  const args = customArgs || EMPTY_ARRAY;
  const taskCall = executor.call(context, task, logic, ...args);

  // Track task execution
  tasks[taskId] = tasks[taskId] || {};
  tasks[taskId][execId] = taskCall;

  return taskCall.exec().then(handleResult, handleResult);
}

function updateModelField(proc, model, key, update) {
  if (update instanceof ChildCmd) {
    bindChild(proc, model, key, update);
    return !update.updateMsg;
  } else if (update instanceof ContextCmd) {
    if (!update.createArgs) return false;
    bindContext(proc, model, key, update);
  } else if (update instanceof ComputedFieldCmd || is.func(update)) {
    bindComputedFieldCmd(proc, model, key, update);
  } else if else if (is.array(update)) {
    const nextModel = model[key] || [];
    fastForEach(update, (nextUpdate, nextKey) => {
      doUpdateModel(proc, nextModel, nextKey, nextUpdate);
    });
    fastForEach(nextModel.slice(update.length), destroyAllProcesses);
  } else {
    destroyAllProcesses(model[key]);
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
    const res = updateModelField(proc, proc.model, k, updateObj[k]);
    modelUpdated = modelUpdated || res;
  });

  if (modelUpdated) {
    maybeForEach(proc.computedFields, (f) => f.reset());
  }

  return modelUpdated;
}

function updateContext(proc, contextCmd) {
  const { logger, contexts, model } = proc;
  const { updateObj, requestFn, subscribeVal } = contextCmd;

  const ctxModel = findContext(proc, contextCmd);
  if (!ctxModel) {
    throw new Error('Context of given type does not exist');
  }

  if (requestFn) {
    proc.exec(requestFn(ctxModel));
    return;
  }

  const ctxProc = procOf(ctxModel);
  if (ctxProc) {
    if (updateObj) {
      ctxProc.exec(updateObj);
    } else if (subscribeVal) {
      const stopSub = handle(ctxModel, (msg) => runLogicUpdate(proc, msg));
      proc.contextSubs.push(stopSub);
    }
  }
}

function sendMessageToParents(proc, msg) {
  const updateLogic = (p) => runLogicUpdate(p, msg);
  const notifyHandler (h) => h(msg);
  let currParent = proc.parent;

  while (currParent) {
    updateLogic(currParent);
    fastForEach(currParent.handlers, notifyHandler);
    currParent = currParent.parent;
  }
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
  const { logger, exec, model } = proc;
  let modelUpdated = false;

  // Prepare and run before handlers
  incExecCounter();
  logger.onStartExec(model, cmd);

  // Execute command
  if (cmd instanceof TaskCmd) {
    const taskPromise = execTask(proc, cmd);
    taskPromise.then(exec, exec);
  } else if (cmd instanceof Message) {
    sendMessageToParents(proc, cmd);
  } else if (cmd instanceof ContextCmd) {
    updateContext(proc, cmd);
  } else if (cmd instanceof ChildCmd) {
    bindParallelLogic(proc, cmd);
  } else if (cmd && (is.array(cmd) || is.func(cmd))) {
    fastForEach(cmd, x => exec(x));
  } else if (is.object(cmd)) {
    modelUpdated = updateModel(proc, cmd);
  }

  // Emit model update for view re-rendering
  if (modelUpdated) {
    runAllObservers(proc);
  }

  // Run after handlers
  logger.onEndExec(model, cmd);
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
  const { parent, logger, logicClass, createArgs,
    internalContext, contexts } = opts;

  this.id = nextId();
  this.logic = new logicClass();
  this.parent = parent;
  this.internalContext = internalContext || { processes: {} };
  this.logger = logger || new DefaultLogger();
  this.createArgs = createArgs || EMPTY_ARRAY;
  this.computedFields = EMPTY_ARRAY;
  this.tasks = {};
  this.observers = [];
  this.children = {};
  this.handlers = [];
  this.contextSubs = [];
  this.contexts = [].concat(contexts, this.ownContext);
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
    this.internalContext.processes[this.id] = this;
    runLogicCreate(this);
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
    delete this.internalContext.processes[this.id];
    if (this.parent) {
      delete this.parent.children[this.id];
    };

    unsubscribeContexts(this);
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
   * - An instance of {@link TaskCmd} (which is usually created by {@link task}
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
   * tasks and related handlers in the all processes in the app
   * will be finished.
   * @return {Promise}
   */
  finished() {
    const promises = [];
    for (let procId in this.internalContext.processes) {
      const proc = this.internalContext.processes[procId];
      for (let taskId in proc.tasks) {
        for (let execId in proc.tasks[taskId]) {
          const execution = proc.tasks[taskId][execId].execution;
          if (is.promise(execution)) {
            promises.push(execution);
          }
        }
      }
    }

    return promises.length
      ? Promise.all(promises).then(() => this.finished())
      : EMPTY_FINISHED;
  }
});

export default Process;
