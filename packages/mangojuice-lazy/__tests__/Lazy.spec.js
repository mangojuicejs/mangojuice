import { Cmd, Task } from "mangojuice-core";
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
    createModel: () => ({ e: 0, f: 4, g: 6 }),
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
      @Cmd.batch CmdFromInit() {}
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
    expect(app.model).toEqual({ e: 12, f: 6, g: 6 });
  });
});
