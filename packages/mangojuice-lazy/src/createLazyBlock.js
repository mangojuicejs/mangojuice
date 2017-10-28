import { utils, cmd, nonhandlable, procOf } from "mangojuice-core";


function createBlockResolver(asyncRequire, resolveState) {
  let required = false;
  let resolveRequirePromise = null;
  const requirePromise = new Promise(r => (resolveRequirePromise = r));

  const runQueuedCommand = (model) => {
    const queue = resolveState.cmds;
    resolveState.cmds = [];

    const proc = procOf(model, true);
    if (proc && queue.length) {
      utils.maybeForEach(queue, ({ args, name }) => {
        proc.exec(proc.logic[name](...args));
      });
    }
  };

  const restartModelBlock = (model) => {
    if (!model) return;

    // Make real model
    const modelArgs = model.__args;
    if (modelArgs) {
      delete model.__args;
      const actualModel = resolveState.block.createModel(...modelArgs);
      Object.assign(model, actualModel);
    }

    // Run real process
    const proc = modelArgs && procOf(model, true);
    if (proc) {
      delete proc.config;
      proc.logic = new resolveState.lazyLogic();
      proc.bind(model);
      proc.run();
    }
  };

  const handleRequireResult = actualBlock => {
    const block = (actualBlock && actualBlock.Logic)
      ? actualBlock : actualBlock.default;
    resolveState.block = block;
    resolveState.lazyLogic.prototype = block.Logic.prototype;
    resolveRequirePromise(block);
  };

  const resolver = function(newModel) {
    const resolveHandler = () => {
      restartModelBlock(newModel);
      runQueuedCommand(newModel);
    };
    if (resolveState.block) {
      return resolveHandler();
    }
    if (!required) {
      required = true;
      asyncRequire(handleRequireResult);
    }
    return requirePromise.then(resolveHandler);
  };

  return resolver;
}

function createLazyLogic(resolveState) {
  const commandsProxy = {
    get: function(target, name) {
      if (utils.is.notUndef(target[name])) {
        return target[name];
      }
      const EmptyExecutor = function(...args) {
        resolveState.cmds.push({ args, name });
        resolveState.resolver(target.model);
      }
      Object.defineProperty(EmptyExecutor, "name", { value: `${name}.Lazy` });
      target[name] = cmd(EmptyExecutor, target);
      target[name].handlable = false;
      return target[name];
    }
  };

  function LazyBlock() {
    if (!resolveState.block) {
      this.__get = commandsProxy.get;
      if (typeof Proxy !== "undefined") {
        return new Proxy(this, commandsProxy);
      }
    }
  }

  utils.extend(LazyBlock.prototype, {
    config: utils.noop,
    children: utils.noop,
    port: utils.noop,
    computed: utils.noop
  });

  resolveState.lazyLogic = LazyBlock;
  return LazyBlock;
}

function createLazyView(resolveState) {
  return props => {
    resolveState.resolver(props.model);
    const block = resolveState.block;
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
  const resolveState = { resolver: null, block: null, cmds: [] };
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
