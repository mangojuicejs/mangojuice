import { LogicBase, utils, message, procOf } from 'mangojuice-core';


function appendUsedChunk(proc, chunkName) {
  if (chunkName) {
    const usedChunks = proc.internalContext.chunks || {};
    usedChunks[chunkName] = true;
    proc.internalContext.chunks = usedChunks;
  }
}

function createBlockResolver(asyncRequire, resolveState) {
  let required = false;
  let resolveRequirePromise = null;
  const requirePromise = new Promise(r => (resolveRequirePromise = r));

  const runQueuedMessages = model => {
    const queue = resolveState.msgs;
    resolveState.msgs = [];

    const proc = procOf(model);
    if (proc && queue.length) {
      utils.maybeForEach(queue, ({ args, name }) => {
        const realMsg = message(resolveState.block.Messages[name], ...args);
        proc.update(realMsg);
      });
    }
  };

  const restartModelBlock = model => {
    if (!model) return;
    const proc = model.__lazy && procOf(model);
    if (proc && !proc.destroyed) {
      delete model.__lazy;
      proc.logic = new resolveState.lazyLogic();
      proc.bind(model);
      proc.run();
    }
  };

  const handleRequireResult = actualBlock => {
    const block =
      actualBlock && actualBlock.Logic ? actualBlock : actualBlock.default;
    resolveState.block = block;
    resolveState.lazyLogic.prototype = block.Logic.prototype;
    resolveState.lazyLogic.constructor = block.Logic.constructor;
    resolveState.lazyLogic = block.Logic;
    utils.extend(resolveState.lazyMessages, block.Messages);
    resolveRequirePromise(block);
  };

  const resolver = function(newModel) {
    const resolveHandler = () => {
      restartModelBlock(newModel);
      runQueuedMessages(newModel);
    };
    if (resolveState.block) {
      return resolveHandler();
    }
    if (!required) {
      required = true;
      const proc = procOf(newModel);
      appendUsedChunk(proc, resolveState.chunkName);
      const res = asyncRequire(proc);
      if (utils.is.promise(res)) {
        res.then(handleRequireResult);
      } else {
        handleRequireResult(res);
      }
    }
    return requirePromise.then(resolveHandler);
  };

  return resolver;
}

function createLazyLogic(resolveState, initModel) {
  // Basic lazy block
  function LazyBlock() {}
  utils.extend(LazyBlock.prototype, {
    create() {
      return [initModel, { __lazy: true }];
    },
    update(msg) {
      resolveState.msgs.push(msg);
      resolveState.resolver(this.model);
    }
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
  };
}

function createLazyMessages(resolveState, messages = []) {
  const lazyMessages = messages.reduce((acc, name) => {
    acc[name] = function LazyMessage(...args) {
      return resolveState.block
        ? resolveState.block.Messages[name](...args)
        : { name, args };
    };
    return acc;
  }, {});
  resolveState.lazyMessages = lazyMessages;
  return lazyMessages;
}

/**
 * Creates a Block which works as a proxy for some other block,
 * which will be returned by `resolver` function provided in the
 * options object. `resolver` can also return a promise which should
 * resolve and actual block.
 *
 * @param  {function} options.resolver
 * @param  {string} options.chunkName
 * @param  {string} options.initModel
 * @param  {function} options.loadingView
 * @param  {Object} options.lazyCommands
 * @return {Object}
 */
function createLazyBlock(
  { resolver, chunkName, initModel, loadingView, messages } = {}
) {
  const resolveState = { resolver: null, block: null, msgs: [], chunkName };
  resolveState.resolver = createBlockResolver(resolver, resolveState);
  const lazyLogic = createLazyLogic(resolveState, initModel);
  const lazyView = createLazyView(resolveState, loadingView);
  const lazyMessages = createLazyMessages(resolveState, messages);

  return {
    resolver: resolveState.resolver,
    Logic: lazyLogic,
    View: lazyView,
    Messages: lazyMessages
  };
}

export default createLazyBlock;
