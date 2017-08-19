import * as Cmd from "./Cmd";
import {
  nextId,
  createResultPromise,
  is,
  maybeMap,
  maybeForEach,
  emptyArray,
  ensureCmdObject,
  memoize,
  noop
} from "./Utils";

// Constants
export const MODEL_UPDATED_EVENT = "updated";
export const CHILD_MODEL_UPDATED_EVENT = "childUpdated";

// Utils
export const createContext = () => ({
  bindings: {}
});

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
    singletonValue
  }) {
    this.id = nextId();
    this.rootProc = rootProc || this;
    this.parentProc = parentProc;
    this.sharedModel = sharedModel;
    this.execHandler = ensureCmdObject(execHandler);
    this.logger = logger;
    this.appContext = appContext || createContext();
    this.logic = logic;
    this.config = config;
    this.configArgs = configArgs || emptyArray;
    this.execHandlers = execHandlers;
    this.singletonValue = singletonValue;
  }

  bind(model) {
    this.bindCommands();
    this.prepareConfig();
    this.bindModel(model);
    this.bindComputed();
    this.bindChildren();
  }

  prepareConfig() {
    if (this.config) return;
    if (!this.logic.config) {
      this.config = {};
    } else {
      const configProps = {
        subscribe: this.subscribe,
        nest: this.nest,
        shared: this.sharedModel,
        binded: this.bindedCommands
      };
      this.config = this.logic.config(configProps, ...this.configArgs) || {};
      this.config.childrenKeys = Object.keys(this.config.children || {});
    }
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

  bindChild(childModel, k) {
    if (childModel && !childModel.__proc) {
      const subProc = new Process(this.config.children[k]);
      subProc.parentProc = this;
      subProc.bind(childModel);
      return true;
    }
    return false;
  }

  bindChildren() {
    return this.mapChildren(this.model, (childModel, k) => {
      this.bindChild(childModel, k);
    });
  }

  /**
   * Make all commands from logic (plus from `singleton` if provided
   * an object or an array) to be binded to the model of this process.
   */
  bindCommands() {
    if (this.singletonValue && this.logic) {
      // Ensure that commands is a list of objects or an object
      let commands = emptyArray;
      if (is.bool(this.singletonValue)) {
        commands = this.logic;
      } else if (is.array(this.singletonValue)) {
        commands = [this.logic, ...this.singletonValue];
      } else if (is.object(this.singletonValue)) {
        commands = [this.logic, this.singletonValue];
      } else {
        throw new Error('You passed something weird in "singleton"');
      }

      // Create bindings in the app context
      const bindedCommands = [];
      const processSingleton = (commandsArr) => {
        maybeForEach(commandsArr, commandsObj => {
          for (let k in commandsObj) {
            const cmd = commandsObj[k];
            if (cmd && cmd.id && cmd.Before && cmd.After) {
              this.appContext.bindings[cmd.id] = this;
              bindedCommands.push(cmd);
            } else if (is.object(cmd)) {
              processSingleton(cmd);
            }
          }
        });
      }
      processSingleton(commands);

      // Set a list of binded commands in the Process
      this.bindedCommands = bindedCommands;
    }
  }

  /**
   * Replace fields in the model with computed getter with memoization
   * if defined in `logic.computed`.
   */
  bindComputed() {
    if (!this.logic.computed) return;
    const computedFields = this.logic.computed(this.execProps);
    if (computedFields) {
      this.computedFields = maybeMap(Object.keys(computedFields), k => {
        const get = memoize(computedFields[k]);
        Object.defineProperty(this.model, k, {
          enumerable: true,
          configurable: true,
          set: noop,
          get
        });
        return get;
      });
    }
  }

  /**
   * Associate instance of the Process with given model by setting
   * hidden `__proc` field in the model.
   * @param  {Object} model
   */
  bindModel(model) {
    this.model = model;
    this.execProps = {
      model: this.model,
      shared: this.sharedModel,
      meta: this.config.meta
    };
    Object.defineProperty(this.model, "__proc", {
      value: this,
      enumerable: false,
      configurable: true
    });
  }

  run() {
    const resPromise = createResultPromise();
    resPromise.add(this.runChildren());
    resPromise.add(this.runSubscriptions());
    resPromise.add(this.runPorts());
    resPromise.add(this.runInitCommands());
    return resPromise.get();
  }

  runChildren() {
    return this.mapChildren(this.model, childModel => {
      return childModel.__proc.run();
    });
  }

  runSubscriptions() {
    this.stopSubscriptions();
    this.subscriptions = [];

    // Reflect to any update of the shared model if this behaviour
    // is not disabled by `manualSharedSubscribe` config field.
    if (
      this.sharedModel &&
      this.sharedModel !== this.rootProc.model &&
      !this.config.manualSharedSubscribe
    ) {
      this.doSubscribe({
        model: this.sharedModel,
        handlerCmd: null,
        initRun: false,
        subEvent: CHILD_MODEL_UPDATED_EVENT
      });
    }

    // Reflect to changes of specific shared sub-model by
    // given subscriptions array in the config
    if (this.config.subscriptions) {
      return Promise.all(maybeMap(this.config.subscriptions, this.doSubscribe));
    }
  }

  doSubscribe = ({
    model,
    handlerCmd,
    initRun = true,
    subEvent = MODEL_UPDATED_EVENT
  }) => {
    const proc = model.__proc;
    const subHandler = cmd => {
      const resPromise = createResultPromise();
      if (handlerCmd) {
        resPromise.add(
          this.exec(Cmd.appendArgs(handlerCmd.clone(), [cmd, model]))
        );
      }
      if (!handlerCmd || this.config.manualSharedSubscribe) {
        this.resetComputedFields();
        resPromise.add(this.emit(MODEL_UPDATED_EVENT, cmd));
      }
      return resPromise.get();
    };
    const subStopper = () => proc.removeListener(subEvent, subHandler);
    proc.addListener(subEvent, subHandler);
    this.subscriptions.push(subStopper);
    return initRun && subHandler(Cmd.defaultNopeCmd());
  }

  runPorts() {
    this.stopPorts();
    if (this.logic.port) {
      const portProps = {
        ...this.execProps,
        exec: this.exec,
        destroy: new Promise(r => (this.portDestroyResolver = r))
      };
      return Promise.resolve(this.logic.port(portProps));
    }
  }

  runInitCommands() {
    if (this.config.initCommands) {
      return Promise.all(
        maybeMap(this.config.initCommands, cmd => this.exec(cmd))
      );
    }
  }

  stopSubscriptions() {
    if (this.subscriptions) {
      maybeForEach(this.subscriptions, x => x());
      this.subscriptions = null;
    }
  }

  stopPorts() {
    if (this.portDestroyResolver) {
      this.portDestroyResolver();
      this.portDestroyResolver = null;
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

  destroy(deep = true) {
    delete this.model.__proc;
    this.unbindCommands();
    this.stopSubscriptions();
    this.stopPorts();
    if (deep) {
      this.mapChildren(this.model, x => x.__proc.destroy(true));
    }
  }

  addListener(event, listener) {
    this.eventHandlers = this.eventHandlers || {};
    this.eventHandlers[event] = this.eventHandlers[event] || [];
    this.eventHandlers[event].push(listener);
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
    const tick = nextId();
    const updateKeys = Object.keys(updateObj);
    const updateMarker = (x, k) => {
      if (this.bindChild(x, k)) {
        x.__proc.run();
      }
      x.__proc.tick = tick;
    };
    const unmarkedDestroyer = x => {
      if (x.__proc.tick !== tick) {
        x.__proc.destroy();
      }
    };

    this.mapChildren(updateObj, updateMarker);
    this.mapChildren(this.model, unmarkedDestroyer, updateKeys);
    this.resetComputedFields();
    Object.assign(this.model, updateObj);
    return true;
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
    const result = cmd.exec(this.execProps);
    if (result) {
      if (cmd.exec === Cmd.execBatch) {
        const batchRes = maybeMap(result, x => x.exec && this.exec(x));
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

    // Run subscriptions if model updated
    if (modelUpdated) {
      this.logger.onEmitSubscriptions(cmd, this.model);
      resPromise.add(this.emit(MODEL_UPDATED_EVENT, cmd));
      if (!this.config.disableRootUpdate) {
        resPromise.add(this.rootProc.emit(CHILD_MODEL_UPDATED_EVENT, cmd));
      }
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
      return cmd._model.__proc.exec(cmd);
    }

    // When command globally binded to some model –
    // run command in appropreate processor
    const bindProc = this.appContext.bindings[cmd.id];
    if (bindProc && bindProc !== this) {
      return bindProc.exec(cmd);
    }

    // No process binded to the model
    if (!this.model.__proc) {
      return Promise.resolve();
    }

    return this.doExecCmd(cmd);
  }

  /**
   * This function creates a `Process` object by given logic.
   * Then you can call `handler` and `args` functions to set
   * specific command to handle all commands in the logic and
   * to set arguments which will be passed to `config` of the logic.
   *
   * Returns ready to bind/run Process instance. Created process
   * instance used by `bindChildren`/`runChildren` functions
   * to bind a process to some children logic and run the process.
   *
   * @param  {Object}  logic
   * @return {Process}
   */
  nest = (logic) => {
    if (!logic) {
      throw new Error("Passed logic is undefined");
    }
    const proc = new Process({
      rootProc: this.rootProc,
      parentProc: this,
      sharedModel: this.sharedModel,
      appContext: this.appContext,
      logger: this.logger,
      logic
    });
    return proc;
  }

  /**
   * Helper function to create subscription object based
   * on given arguments. Returned object will be used by
   * `runSubscription` function of `Process`
   *
   * @param  {?Function|?Object} handler [description]
   * @param  {Object} model
   * @return {Object}
   */
  subscribe = (model) => ({
    model,
    handlerCmd: null,
    handler(handler) {
      this.handlerCmd = ensureCmdObject(handler);
      return this;
    },
  })

  /**
   * Set command exec handler cmd, which will be executed after
   * each execution of a command in this process or in any
   * child process. The handler executed in scope of parent process
   * (because parent process usually wants to handle commands of child
   * process)
   * @param  {?Function|?Object} handler
   * @return {Process}
   */
  handler(handler) {
    this.execHandler = ensureCmdObject(handler);
    return this;
  }

  /**
   * Set arguments which will be passed to config function of the
   * logic of this process.
   * @param  {...any} args
   * @return {Process}
   */
  args(...args) {
    this.configArgs = args;
    return this;
  }

  /**
   * Mark this process as singleton. It will make all commands from
   * attached Logic to be automatically binded to the model of this
   * process. So you will be able to write `Logic.Command` and not
   * `Logic.Command().model(...)`
   * @param  {Boolean|Object|Array<Object>|null} val
   * @return {Process}
   */
  singleton(val) {
    this.singletonValue = val;
    return this;
  }
}

export default Process;
