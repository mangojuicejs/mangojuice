import { child, logicOf, procOf, handle, message } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('handle', () => {
  it('should catch messages emitted by the logic', async () => {
    class Test {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    handle(app.model, handler);
    app.proc.exec(logicOf(app.model).emitMessage);

    expect(app.model).toMatchSnapshot();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toMatchSnapshot();
  });

  it('should catch messages emitted by children logic', async () => {
    class ChildLogic {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }
    class Test {
      create() {
        return { test: child(ChildLogic).create() };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    handle(app.model, handler);
    procOf(app.model.test).exec(logicOf(app.model.test).emitMessage);

    expect(app.model).toMatchSnapshot();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toMatchSnapshot();
  });

  it('should NOT catch messages emitted by sibling logic', async () => {
    class ChildLogic {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }
    class SiblingLogic {
    }
    class Test {
      create() {
        return {
          test: child(ChildLogic).create(),
          sibling: child(SiblingLogic).create()
        };
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    handle(app.model.sibling, handler);
    procOf(app.model.test).exec(logicOf(app.model.test).emitMessage);

    expect(app.model).toMatchSnapshot();
    expect(handler).toHaveBeenCalledTimes(0);
  });

  it('should cancel the handler', async () => {
    class Test {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }

    const handler = jest.fn();
    const { app } = runWithTracking({ app: { Logic: Test } });
    handle(app.model, handler).stopper();
    app.proc.exec(logicOf(app.model).emitMessage);

    expect(app.model).toMatchSnapshot();
    expect(handler).toHaveBeenCalledTimes(0);
  });
});
