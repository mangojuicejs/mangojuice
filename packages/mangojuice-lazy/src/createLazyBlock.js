import { Utils, Cmd, Task, MODEL_UPDATED_EVENT } from "mangojuice-core";

export function createBlockResolver(asyncRequire, lazyBlock) {
  let required = false;
  let resolvedBlock = null;
  let resolveRequirePromise = null;
  const requirePromise = new Promise(r => (resolveRequirePromise = r));

  const restartModelBlock = model => {
    const modelArgs = model.__args;
    if (modelArgs) {
      delete model.__args;
      const actualModel = resolvedBlock.createModel(...modelArgs);
      Object.assign(model, actualModel);
    }

    const logicArgs = model.__proc && model.__proc.config.__args;
    if (logicArgs) {
      delete model.__proc.config;
      model.__proc.logic = resolvedBlock.Logic;
      model.__proc.bind(model);
      model.__proc.run();
      model.__proc.emit(MODEL_UPDATED_EVENT);
    }
  };

  const handleRequireResult = actualBlock => {
    resolvedBlock = actualBlock;
    resolver.resolvedBlock = actualBlock;
    Object.keys(lazyBlock.Logic).forEach(k => {
      const cmd = actualBlock.Logic[k];
      if (cmd && cmd.id) {
        actualBlock.Logic[k].id = lazyBlock.Logic[k].id;
      }
    });
    Object.assign(lazyBlock.Logic, actualBlock.Logic);
    Object.assign(lazyBlock, actualBlock);
    resolveRequirePromise(actualBlock);
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

export function createLazyLogic(resolver) {
  const commandsProxy = {
    get: function(target, name) {
      if (Utils.is.notUndef(target[name])) {
        return target[name];
      }
      const WrapperCmd = Cmd.createBatchCmd(`Lazy.${name}.Wrapper`, function(
        ctx,
        ...args
      ) {
        const readyBlock = args[args.length - 1];
        const actualArgs = args.slice(0, args.length - 1);
        target[name] = readyBlock.Logic[name];
        return readyBlock.Logic[name](...actualArgs);
      });
      target[name] = Cmd.createTaskCmd(`Lazy.${name}.Resolver`, function(
        props,
        ...args
      ) {
        return Task.create(function({ model }) {
          return resolver(model);
        }).success(WrapperCmd(...args));
      });
      return target[name];
    }
  };

  const logic = {
    name: "",
    port: () => {},
    config: (...args) => ({ __args: args }),
    computed: () => {},
    __get: commandsProxy.get
  };

  return typeof Proxy !== "undefined" ? new Proxy(logic, commandsProxy) : logic;
}

export function createLazyBlock(blockRequire) {
  const lazyBlock = {};
  const resolver = createBlockResolver(blockRequire, lazyBlock);
  return Object.assign(lazyBlock, {
    resolver,
    Logic: createLazyLogic(resolver),
    View: props => {
      const block = resolver(props.model);
      return block && block.View ? block.View(props) : null;
    },
    createModel: (...args) => {
      return resolver.resolvedBlock
        ? resolver.resolvedBlock.createModel(...args)
        : { __args: args };
    }
  });
}
