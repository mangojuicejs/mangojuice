import { child, logicOf, procOf, handle, context, observe } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('observe', () => {
  it('should catch model updates of the logic', async () => {
    class Test {
      create() {
        return { a: 123 };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    const stopper = observe(app.model, handler);
    app.proc.exec({ a: 321 });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should NOT catch model updates if nothing new updated', async () => {
    class Test {
      create() {
        return { a: 123 };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    const stopper = observe(app.model, handler);
    app.proc.exec({ a: 123 });

    expect(handler).toHaveBeenCalledTimes(0);
  });

  it('should NOT catch updates of children models', async () => {
    class ChildLogic {}
    class Test {
      create() {
        return { a: child(ChildLogic).create() };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    const stopper = observe(app.model, handler);
    procOf(app.model.a).exec({ a: 321 });

    expect(handler).toHaveBeenCalledTimes(0);
  });

  it('should catch update only at the end of the commands stack', async () => {
    class Test {
      create() {
        return { a: 123 };
      }
      commandsStack() {
        return [
          { a: 321 },
          { a: 456 },
          this.anotherCommand
        ];
      }
      anotherCommand() {
        return { a: 789 };
      }
    }

    let modelVal = null;
    const { app } = runWithTracking({ app: { Logic: Test } });
    const handler = jest.fn(() => modelVal = app.model.a);
    const stopper = observe(app.model, handler, { batched: true });
    app.proc.exec(logicOf(app.model).commandsStack);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(modelVal).toEqual(789);
  });

  it('should observe context avilable for the base model', async () => {
    class ChildLogic {
      update(msg) { return { ...msg }; }
    }
    const TEST_CONTEXT = () => ({ test: child(ChildLogic).create() });
    class Test {
      create() {
        return { a: context(TEST_CONTEXT).create() };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    const stopper = observe(TEST_CONTEXT, handler, { model: app.model });
    procOf(app.model).exec(context(TEST_CONTEXT).update(()=>({a: 123})));

    expect(handler).toHaveBeenCalledTimes(0);
    expect(app.model.a.test.a).toEqual(123);
  });

  it('should stop observer', async () => {
    class Test {
      create() {
        return { a: 123 };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    const { stopper } = observe(app.model, handler);
    stopper();
    app.proc.exec({ a: 321 });

    expect(handler).toHaveBeenCalledTimes(0);
  });

  it('should return observed model', async () => {
    class ChildLogic {
      update(msg) { return { ...msg }; }
    }
    const TEST_CONTEXT = () => ({ test: child(ChildLogic).create() });
    class Test {
      create() {
        return { a: context(TEST_CONTEXT).create() };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    const { model } = observe(TEST_CONTEXT, handler, { model: app.model });
    procOf(app.model).exec(context(TEST_CONTEXT).update(()=>({a: 123})));

    expect(model).toMatchSnapshot();
  });
});
