import { Cmd, Task, LogicBase } from "mangojuice-core";
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
    Logic: {
      name: "AppBlock",
      config() {
        return {
          initCommands: this.CmdFromInit,
          meta: 'test-meta'
        }
      },
      port() {
        return this.exec(this.CmdFromPort);
      },
      computed() {
        return {
          e: () => this.model.f + this.model.g
        };
      },
      @Cmd.update
      SetField(name, value) {
        return { [name]: value };
      },
      @Cmd.batch CmdFromPort() {},
      @Cmd.update CmdFromInit() {
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

    await app.proc.exec(LazyBlock.Logic.SetField('f', 6));
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
      createModel: () => ({}),
      Logic: new (class AppLogic extends LogicBase {
        config() {
          return {
            initCommands: this.CmdFromInit,
            meta: 'test-meta'
          }
        }
        port() {
          return this.exec(this.CmdFromPort);
        }
        @Cmd.batch CmdFromPort() {}
        @Cmd.update CmdFromInit() {
          return { c: this.meta }
        }
        @Cmd.update
        SetField(name, value) {
          return { [name]: value };
        }
      })
    };
    const { resolver, resolved } = createMockBlockResolver(BlockChild);
    const LazyBlock = lazyUtils.createLazyBlock(resolver);
    const BlockParent = {
      createModel: () => ({ child: null }),
      Logic: {
        name: "BlockParent",
        children() {
          return { child: this.nest(LazyBlock.Logic) };
        },
        @Cmd.update SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockParent
    });

    await app.proc.exec(BlockParent.Logic.SetField('child', LazyBlock.createModel()));
    await app.model.child.__proc.exec(LazyBlock.Logic.SetField('a', 123));
    await resolved;
    await app.proc.exec(BlockParent.Logic.SetField('child', LazyBlock.createModel()));

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
});
