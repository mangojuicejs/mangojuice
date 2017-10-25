import { Utils, Cmd, Task, LogicBase } from "mangojuice-core";


function createBlockResolver(asyncRequire, resolveState) {
  let required = false;
  let resolvedBlock = null;
  let resolveRequirePromise = null;
  const requirePromise = new Promise(r => (resolveRequirePromise = r));

  const restartModelBlock = model => {
    if (!model) return;

    // Make real model
    const modelArgs = model.__args;
    if (modelArgs) {
      delete model.__args;
      const actualModel = resolvedBlock.createModel(...modelArgs);
      Object.assign(model, actualModel);
    }

    // Run real process
    if (modelArgs && model.__proc) {
      delete model.__proc.config;
      model.__proc.logic = resolveState.lazyLogic;
      model.__proc.bind(model);
      model.__proc.run();
      model.__proc.emitModelUpdate();
    }
  };

  const handleRequireResult = actualBlock => {
    const block = actualBlock && actualBlock.Logic
      ? actualBlock : actualBlock.default;

    resolvedBlock = block;
    resolveState.block = block;

    Object.keys(resolveState.lazyLogic).forEach(k => {
      const cmd = block.Logic[k];
      if (Utils.is.command(cmd)) {
        block.Logic[k].id = resolveState.lazyLogic[k].id;
        block.Logic[k].Before = resolveState.lazyLogic[k].Before;
        block.Logic[k].After = resolveState.lazyLogic[k].After;
      }
    });

    Object.keys(Object.getPrototypeOf(block.Logic)).forEach(k => {
      const cmd = block.Logic[k];
      if (Utils.is.command(cmd)) {
        resolveState.lazyLogic[k] = cmd;
      }
    });

    resolveState.lazyLogic.name = block.Logic.name || block.Logic.constructor.name;
    resolveRequirePromise(block);
  };

  const resolver = function(newModel) {
    if (resolvedBlock) {
      restartModelBlock(newModel);
      return resolvedBlock;
    }

    const resolveHandler = restartModelBlock.bind(null, newModel);
    if (required) {
      return requirePromise.then(resolveHandler);
    } else {
      required = true;
      asyncRequire(handleRequireResult);
      requirePromise.then(resolveHandler);
      return requirePromise;
    }
  };

  return resolver;
}

function createLazyLogic(resolveState) {
  const getRealLogic = () => {
    return resolveState.block && resolveState.block.Logic;
  };

  const commandsProxy = {
    get: function(target, name) {
      if (Utils.is.notUndef(target[name])) {
        return target[name];
      }
      const WrapperCmd = Cmd.createBatchCmd(`Lazy.${name}.Wrapper`,
        function(...args) {
          const readyBlock = args[args.length - 1];
          const actualArgs = args.slice(0, args.length - 1);
          target[name] = readyBlock.Logic[name];
          return readyBlock.Logic[name](...actualArgs);
        }
      );
      target[name] = Cmd.createTaskCmd(`Lazy.${name}.Resolver`,
        function(...args) {
          return Task.create(function({ model }) {
            return resolveState.resolver(model);
          }).success(WrapperCmd(...args));
        }
      );
      return target[name];
    }
  };

  const createLazyLogicFunc = (name) => {
    return function lazyLogicFunc(...args) {
      const realLogic = getRealLogic();
      if (realLogic && realLogic[name]) {
        return realLogic[name].apply(this, args);
      }
    };
  };

  const logic = {
    name: "LazyBlock",
    port: createLazyLogicFunc('port'),
    children: createLazyLogicFunc('children'),
    config: createLazyLogicFunc('config'),
    computed: createLazyLogicFunc('computed'),
    __get: commandsProxy.get
  };

  resolveState.lazyLogic = logic;
  return typeof Proxy !== "undefined"
    ? new Proxy(logic, commandsProxy)
    : logic;
}

function createLazyView(resolveState) {
  return props => {
    const block = resolveState.resolver(props.model);
    return block && block.View ? block.View(props) : null;
  }
}

function createLazyModel(resolveState) {
  return (...args) => {
    return resolveState.block
      ? resolveState.block.createModel(...args)
      : { __args: args };
  }
}

export function createLazyBlock(blockRequire) {
  const resolveState = { resolver: null, block: null };
  resolveState.resolver = createBlockResolver(blockRequire, resolveState);
  const lazyLogic = createLazyLogic(resolveState);
  const lazyView = createLazyView(resolveState);
  const lazyCreateModel = createLazyModel(resolveState);

  return {
    resolver: resolveState.resolver,
    Logic: lazyLogic,
    View: lazyView,
    createModel: lazyCreateModel
  };
}
