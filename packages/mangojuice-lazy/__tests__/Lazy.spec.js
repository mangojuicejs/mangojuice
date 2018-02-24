import { logicOf, child, utils, message } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import { createLazyBlock, getUsedChunks } from "mangojuice-lazy";


const createMockBlockResolver = (Block) => {
  let resolve = null;
  const resolvePromise = new Promise(r => resolve = r);
  const resolver = () => new Promise(r => {
    setTimeout(() => {
      r(Block);
      utils.delay(10).then(resolve);
    }, 100);
  });
  return { resolved: resolvePromise, resolver };
};

describe('Lazy block loading', () => {
  const AppBlock = {
    Messages: {
      TestMessage: (...args) => ({ args })
    },
    Logic: class AppBlock {
      create(...args) {
        return { e: 0, f: 4, g: 6, c: null, args };
      }
      update = jest.fn()
    }
  };

  it('shuold do nothing if view is not triggered', async () => {
    const resolver = jest.fn();
    const LazyBlock = createLazyBlock({ resolver });
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    expect(commandNames).toMatchSnapshot();
    expect(resolver).not.toBeCalled();
  });

  it('should resolve block when view reuqested', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = createLazyBlock({ resolver });
    const { app, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    LazyBlock.View({ model: app.model });
    await resolved;
    await utils.delay(10);

    expect(commandNames).toMatchSnapshot();
    expect(app.model).toMatchSnapshot();
  });

  it('should resolve block when lazy message executed', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = createLazyBlock({ resolver, messages: ['TestMessage'] });
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    await app.proc.update(message(LazyBlock.Messages.TestMessage,1,2,3));
    await resolved;

    expect(commandNames).toMatchSnapshot();
    expect(app.model).toMatchSnapshot();
    expect(app.proc.logic.update.mock.calls).toMatchSnapshot();
  });

  it('should works on re-render after resolve', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = createLazyBlock({ resolver, messages: ['TestMessage'] });
    const BlockParent = {
      Logic: class BlockParent {
        create() {
          return { child: child(LazyBlock.Logic).create('a', 'b', 'c') };
        }
      }
    };
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockParent
    });

    await app.proc.exec({ child: child(LazyBlock.Logic).update(message(LazyBlock.Messages.TestMessage,1,2,3)) });
    await resolved;
    await app.proc.exec({ child: child(LazyBlock.Logic).update(message(LazyBlock.Messages.TestMessage,'111')) });

    expect(commandNames).toMatchSnapshot()
    expect(app.model.child).toMatchSnapshot();
    expect(logicOf(app.model.child).update.mock.calls).toMatchSnapshot();
  });

  it('should NOT fill model with actual data even if the model was detached', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = createLazyBlock({ resolver });
    const { app, commandNames, errors } = await runWithTracking({
      app: LazyBlock
    });

    LazyBlock.View({ model: app.model });
    app.proc.destroy();
    await resolved;
    await utils.delay(10);

    expect(commandNames).toMatchSnapshot();
    expect(app.model).toMatchSnapshot();
  });

  it('should resolve multiple lazy children', async () => {
    const { resolver, resolved } = createMockBlockResolver(AppBlock);
    const LazyBlock = createLazyBlock({ resolver, messages: ['TestMessage'] });
    const BlockParent = {
      Logic: class BlockParent {
        create() {
          return {
            child: [
              child(LazyBlock.Logic).create('a', 'b', 'c'),
              child(LazyBlock.Logic).create('aaa'),
            ],
            anotherChild: child(LazyBlock.Logic).create('ccc')
          };
        }
      }
    };
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockParent
    });

    await app.proc.exec({ anotherChild: child(LazyBlock.Logic).update(message(LazyBlock.Messages.TestMessage,1,2,3)) });
    await app.proc.exec({ child: [
      child(LazyBlock.Logic).update(message(LazyBlock.Messages.TestMessage,1,2,3)),
      child(LazyBlock.Logic).update(message(LazyBlock.Messages.TestMessage,133))
    ] });
    await resolved;

    expect(commandNames).toMatchSnapshot()
    expect(app.model).toMatchSnapshot();
  });
});
