import { cmd, logicOf, child } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import lazyUtils from "mangojuice-lazy";


const createMockBlockResolver = (Block) => {
  let resolve = null;
  const resolvePromise = new Promise(r => resolve = r);
  const resolver = (callback) => setTimeout(() => {
    callback(Block);
    resolve();
  }, 100);
  return { resolved: resolvePromise, resolver };
};

describe('Lazy block loading', () => {
  const AppBlock = {
    createModel: () => ({ e: 0, f: 4, g: 6, c: null }),
    Logic: class AppBlock {
      config() {
        return {
          initCommands: this.CmdFromInit,
          meta: 'test-meta'
        }
      }
      port({ exec }) {
        return exec(this.CmdFromPort);
      }
      computed() {
        return {
          e: () => this.model.f + this.model.g
        };
      }
      @cmd SetField(name, value) {
        return { [name]: value };
      }
      @cmd CmdFromPort() {}
      @cmd CmdFromInit() {
        return { c: this.meta }
      }
    }
  };

  it('shuold do nothing if view is not triggered', async () => {
    const resolver = jest.fn();
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    expect(commandNames).toEqual([]);
    expect(resolver).not.toBeCalled();
  });

  it('should resolve block when view reuqested', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    LazyBlock.View({ model: app.model });
    await resolved;

    expect(commandNames).toEqual([
      'AppBlock.CmdFromPort',
      'AppBlock.CmdFromInit'
    ]);
  });

  it('should resolve block when any command executed', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    await app.proc.exec(logicOf(app.model).SetField('f', 6));
    await resolved;

    expect(commandNames).toEqual([
      'LazyBlock.Lazy.SetField.Resolver',
      'AppBlock.CmdFromPort',
      'AppBlock.CmdFromInit',
      'AppBlock.Lazy.SetField.Wrapper',
      'AppBlock.SetField'
    ]);
    expect(app.model).toEqual({ e: 12, f: 6, g: 6, c: 'test-meta' });
  });

  it('should works on re-render after resolve', async () => {
    const BlockChild = {
      createModel: (props) => ({ ...props }),
      Logic: new (class AppLogic {
        config() {
          return {
            initCommands: this.CmdFromInit,
            meta: 'test-meta'
          }
        }
        port({ exec }) {
          return exec(this.CmdFromPort);
        }
        @cmd CmdFromPort() {}
        @cmd CmdFromInit() {
          return { c: this.meta }
        }
        @cmd SetField(name, value) {
          return { [name]: value };
        }
      })
    };
    const { resolver, resolved } = createMockBlockResolver(BlockChild);
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const BlockParent = {
      createModel: () => ({ child: null }),
      Logic: class BlockParent {
        children() {
          return { child: child(LazyBlock.Logic) };
        }
        @cmd SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockParent
    });

    await app.proc.exec(logicOf(app.model).SetField('child', LazyBlock.createModel({'b': 321})));
    await app.proc.exec(logicOf(app.model.child).SetField('a', 123));
    await resolved;
    await app.proc.exec(logicOf(app.model).SetField('child', LazyBlock.createModel()));

    expect(commandNames).toEqual([
      'BlockParent.SetField',
      'LazyBlock.Lazy.SetField.Resolver',
      'AppLogic.CmdFromPort',
      'AppLogic.CmdFromInit',
      'AppLogic.Lazy.SetField.Wrapper',
      'AppLogic.SetField',
      'BlockParent.SetField',
      'AppLogic.CmdFromPort',
      'AppLogic.CmdFromInit',
    ]);
    expect(app.model.child).toEqual({ c: 'test-meta' });
  });

  it('should update model after resolve', async () => {
    const BlockChild = {
      createModel: (props) => ({ ...props }),
      Logic: new (class AppLogic {
        @cmd SetField(name, value) {
          return { [name]: value };
        }
      })
    };
    const { resolver, resolved } = createMockBlockResolver(BlockChild);
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const BlockParent = {
      createModel: () => ({ child: null }),
      Logic: class BlockParent {
        children() {
          return { child: child(LazyBlock.Logic) };
        }
        @cmd SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockParent
    });

    const lazyModel = LazyBlock.createModel({'b': 321});
    expect(lazyModel).toEqual({ __args: [{'b': 321}] });

    await app.proc.exec(logicOf(app.model).SetField('child', lazyModel));
    await app.proc.exec(logicOf(app.model.child).SetField('a', 123));
    await resolved;
    expect(app.model.child).toEqual({ a: 123, b: 321 });

    const realModel = LazyBlock.createModel({'b': 321});
    expect(realModel).toEqual({'b': 321});

    await app.proc.exec(logicOf(app.model).SetField('child', LazyBlock.createModel()));
    expect(app.model.child).toEqual({});
  });

  it('should fill model with actual data even if the model was detached', async () => {
    const BlockChild = {
      createModel: (props) => ({ ...props }),
      Logic: new (class AppLogic {
        @cmd SetField(name, value) {
          return { [name]: value };
        }
      })
    };
    const { resolver, resolved } = createMockBlockResolver(BlockChild);
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const BlockParent = {
      createModel: () => ({ child: null }),
      Logic: class BlockParent {
        children() {
          return { child: child(LazyBlock.Logic) };
        }
        @cmd SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockParent
    });

    const lazyModel = LazyBlock.createModel({'b': 321});
    app.proc.exec(logicOf(app.model).SetField('child', lazyModel));
    const changeLazy = app.proc.exec(logicOf(app.model.child).SetField('a', 123));
    app.proc.exec(logicOf(app.model).SetField('child', null));
    await resolved;
    await changeLazy;

    expect(lazyModel).toEqual({ b: 321 });
    expect(app.model.child).toEqual(null);
  });
});
