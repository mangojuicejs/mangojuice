import { utils, cmd, defineCommand, procOf } from "mangojuice-core";


function appendUsedChunk(proc, chunkName) {
  if (chunkName) {
    const usedChunks = proc.context.chunks || {};
    usedChunks[chunkName] = true;
    proc.context.chunks = usedChunks;
  }
}

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
      const proc = procOf(newModel);
      appendUsedChunk(proc, resolveState.chunkName);
      asyncRequire(proc).then(handleRequireResult);
    }
    return requirePromise.then(resolveHandler);
  };

  return resolver;
}

function createLazyLogic(resolveState, lazyCommands) {
  // Basic lazy block
  function LazyBlock() {}
  utils.extend(LazyBlock.prototype, {
    config: utils.noop,
    children: utils.noop,
    hub: utils.noop,
    hubAfter: utils.noop,
    hubBefore: utils.noop,
    port: utils.noop,
    computed: utils.noop
  });

  // Define all exported lazy commands
  const lazyProto = LazyBlock.prototype;
  utils.maybeForEach(lazyCommands, (name) => {
    lazyProto[name] = function(...args) {
      resolveState.cmds.push({ args, name });
      resolveState.resolver(this.model);
    };
    defineCommand(lazyProto, name, cmd, true, `${name}.Lazy`);
  });

  resolveState.lazyLogic = LazyBlock;
  return LazyBlock;
}

function createLazyView(resolveState, loadingView = utils.noop) {
  return (props, context) => {
    resolveState.resolver(props.model);
    const block = resolveState.block;
    return block && block.View
      ? block.View(props, context)
      : loadingView(props, context);
  }
}

function createLazyModel(resolveState, initModel) {
  return (...args) => {
    return resolveState.block
      ? resolveState.block.createModel(...args)
      : { ...initModel, __args: args };
  }
}

function createLazyBlock({
  resolver,
  chunkName,
  initModel,
  loadingView,
  lazyCommands
} = {}) {
  const resolveState = { resolver: null, block: null, cmds: [], chunkName };
  resolveState.resolver = createBlockResolver(resolver, resolveState);
  const lazyLogic = createLazyLogic(resolveState, lazyCommands);
  const lazyView = createLazyView(resolveState, loadingView);
  const lazyCreateModel = createLazyModel(resolveState, initModel);

  return {
    resolver: resolveState.resolver,
    Logic: lazyLogic,
    View: lazyView,
    createModel: lazyCreateModel
  };
}

export default createLazyBlock;

