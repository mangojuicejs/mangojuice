import TaskCmd from './TaskCmd';
import Message from './Message';
import ContextCmd from './ContextCmd';
import ContextLogic from './ContextLogic';
import ChildCmd from './ChildCmd';
import DebounceTask from './DebounceTask';
import DefaultLogger from './DefaultLogger';
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


function createInternalContext() {
  return {
    processes: {},
    stackCounter: 0,
    emptyStackHandlers: {},
  };
}

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

function runProcessOnModel(proc, model, childCmd) {
  const { logicClass, updateMsg, createArgs } = childCmd;
}

function updateChildLogic(proc, model, childCmd) {
  const { logicClass, updateMsg, createArgs } = childCmd;
  let currProc = procOf(model);

  // Protect update of the model of the same type
  if (updateMsg && (!currProc || !(currProc.logic instanceof logicClass))) {
    proc.logger.onCatchError(new Error('Child model does not exists or have incorrect type'), proc);
    return;
  }

  // Re-run prepare with new config args if proc already running
  // with the same logic class, otherwise destroy the logic
  if (currProc) {
    if (!updateMsg) {
      currProc.destroy();
      currProc = null;
    } else {
      runLogicUpdate(currProc, updateMsg);
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
  const currModel = model[key] || {};
  const nextProc = updateChildLogic(proc, currModel, childCmd);
  if (nextProc) {
    model[key] = currModel;
  }
}

/**
 * Bind field in the model with given computed function or dependency
 * object.
 *
 * @private
 * @param  {Process} proc
 * @param  {string} fieldName
 * @param  {function} computeVal
 * @return {Memoize}
 */
function bindComputedFieldCmd(proc, model, key, computeVal) {
  const { logger } = proc;
  const get = memoize(() => safeExecFunction(logger, computeVal));
  proc.computedFields[key] = get;

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
  const { logger } = proc;
  const { contextFn, createArgs, id } = contextCmd;

  if (!proc.ownContext[id]) {
    const childDef = child(ContextLogic).create(contextFn, createArgs);
    bindChild(proc, model, key, childDef);
    proc.ownContext[id] = model[key];
  } else {
    logger.onCatchError(new Error(`Context "${contextFn.name}" already created`));
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
  runLogicFunc(proc, 'create', proc.createArgs);
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
function runModelObservers(proc) {
  const observersIterator = (obs) => obs();
  maybeForEach(proc.observers, observersIterator);
  if (proc.parent) {
    maybeForEach(proc.childrenObservers, observersIterator);
  }
}

/**
 * Stop all running observers for all existing computed fields
 *
 * @private
 * @param  {Process} proc
 */
function destroyAttachedProcess(model) {
  const currProc = procOf(model);
  if (currProc) {
    currProc.destroy();
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

function runEmptyStackHandlers(proc) {
  const { internalContext } = proc;
  const handlersObj = internalContext.emptyStackHandlers;
  const handlerIds = Object.keys(handlersObj);
  const queuedObserversIterator = (handlerId) => handlersObj[handlerId]();

  internalContext.emptyStackHandlers = {};
  fastForEach(handlerIds, queuedObserversIterator);
}

function handleStackPush(proc) {
  const { internalContext } = proc;
  internalContext.stackCounter += 1;
}

function handleStackPop(proc) {
  const { internalContext } = proc;
  internalContext.stackCounter -= 1;

  if (internalContext.stackCounter <= 0) {
    internalContext.stackCounter = 0;
    runEmptyStackHandlers(proc);
  }
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
  const { tasks, logger, model, sharedModel, config, logic } = proc;
  const { task, executor, notifyCmd, successCmd, failCmd,
    customArgs, execEvery, customExecId, id: taskId } = taskObj;

  // If not in multi-thread mode or just need to cancel a tak –
  // cancel all running task with same identifier (command id)
  if (taskObj.cancelTask || !execEvery) {
    cancelTask(proc, taskId);
    if (taskObj.cancelTask) return;
  }

  // Define next execution id
  const execId = customExecId || nextId();
  const executions = tasks[taskId] = tasks[taskId] || {};

  // Do not create any new task if the task with given exec id
  // already exists. Usefull for throttle/debounce tasks
  if (executions[execId]) {
    executions[execId].exec(taskObj);
    return;
  }

  // Handle result of the execution of a task – returns
  // success command if error not defined, fail command otherwise
  const handleResult = ({ result, error }) => {
    delete executions[execId];
    if (error && !error.cancelled) {
      return failCmd
        ? () => failCmd.call(logic, error)
        : logger.onCatchError(error, proc, taskObj);
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
  const taskCall = executor(handleNotify, taskObj, logic);

  // Track task execution
  executions[execId] = taskCall;
  taskCall.exec(taskObj)
    .then(handleResult, handleResult)
    .then(proc.exec, proc.exec);
}

function updateModelField(proc, model, key, update) {
  if (update instanceof ChildCmd) {
    bindChild(proc, model, key, update);
    return !update.updateMsg;
  } else if (update instanceof ContextCmd) {
    if (!update.createArgs) return false;
    bindContext(proc, model, key, update);
  } else if (is.func(update)) {
    bindComputedFieldCmd(proc, model, key, update);
  } else if (is.array(update)) {
    const nextModel = model[key] && model[key].slice(0, update.length) || [];
    fastForEach(update, (nextUpdate, nextKey) => {
      updateModelField(proc, nextModel, nextKey, nextUpdate);
    });
    if (model[key] && update.length !== model[key].length) {
      for (let i = update.length - 1; i < model[key].length; i++) {
        destroyAttachedProcess(model[key][i])
      }
    }
    model[key] = nextModel;
  } else {
    if (model[key] === update) return false;
    destroyAttachedProcess(model[key]);
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
    for (let k in proc.computedFields) {
      proc.computedFields[k].reset();
    }
  }

  return modelUpdated;
}

function updateContext(proc, contextCmd) {
  const { logger, contexts, model, logic } = proc;
  const { updateMsg, requestFn, subscribeVal } = contextCmd;

  const ctxModel = findContext(proc, contextCmd);
  const ctxProc = procOf(ctxModel);
  if (!ctxModel || !ctxProc) {
    logger.onCatchError(new Error('Context of given type does not exist'), proc);
    return;
  }

  if (requestFn) {
    const safeExecReceiver = () => requestFn.call(logic, ctxModel);
    proc.exec(safeExecReceiver);
  } else if (updateMsg) {
    forEachChildren(ctxProc, (p) =>  runLogicUpdate(p, updateMsg));
  } else if (subscribeVal) {
    const { stopper } = handle(ctxModel, (msg) => runLogicUpdate(proc, msg));
    proc.contextSubs.push(stopper);
  }
}

function sendMessageToParents(proc, msg) {
  const updateLogic = (p) => runLogicUpdate(p, msg);
  const notifyHandler = (h) => h(msg);
  let currParent = proc.parent;

  fastForEach(proc.handlers, notifyHandler);
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
  handleStackPush(proc);
  logger.onStartExec(model, cmd);

  // Execute command
  if (cmd instanceof TaskCmd) {
    execTask(proc, cmd);
  } else if (cmd instanceof Message) {
    sendMessageToParents(proc, cmd);
  } else if (cmd instanceof ContextCmd) {
    updateContext(proc, cmd);
  } else if (cmd && (is.array(cmd) || is.func(cmd))) {
    fastForEach(cmd, x => exec(x));
  } else if (is.object(cmd)) {
    modelUpdated = updateModel(proc, cmd);
  }

  // Emit model update for view re-rendering
  if (modelUpdated) {
    runModelObservers(proc);
  }

  // Run after handlers
  logger.onEndExec(model, cmd);
  handleStackPop(proc);
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
  this.internalContext = internalContext || createInternalContext();
  this.logger = logger || new DefaultLogger();
  this.createArgs = createArgs || EMPTY_ARRAY;
  this.computedFields = {};
  this.tasks = {};
  this.observers = [];
  this.childrenObservers = [];
  this.children = {};
  this.handlers = [];
  this.contextSubs = [];
  this.ownContext = {};
  this.contexts = [this.ownContext].concat(contexts || EMPTY_ARRAY);
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
    runModelObservers(this);
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
    this.computedFields = {};
    this.observers = [];
    this.childrenObservers = [];
    this.handlers = [];
    this.destroyed = true;

    delete this.model.__proc;
    delete this.internalContext.processes[this.id];
    if (this.parent) {
      delete this.parent.children[this.id];
    };

    unsubscribeContexts(this);
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
