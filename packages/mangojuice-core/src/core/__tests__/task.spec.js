import { child, message, logicOf, procOf, task, utils } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('task', () => {
  it('should call success handler if provided', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
      }
      *testTask() {
        yield utils.delay(50);
        return { hello: 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should call fail handler if provided', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .fail(this.failHandler)
      }
      *testTask() {
        yield utils.delay(50);
        throw new Error('ooops');
        return { hello: 'there!' };
      }
      failHandler(...args) {
        return { fail: args };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should emit update event yielded from task', async () => {
    class TestLogic {
      create() {
        return task(this.testTask);
      }
      update = jest.fn();
      *testTask() {
        yield message(() => ({ hey: 'there!' }));
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
    const logic = logicOf(app.model);

    expect(logic.update.mock.calls).toMatchSnapshot();
  });

  it('should emit update event yielded from subtask', async () => {
    class TestLogic {
      create() {
        return task(this.testTask);
      }
      update = jest.fn();
      *testTask() {
        yield this.testSubtask;
      }
      *testSubtask() {
        yield message(() => ({ hey: 'there!' }));
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
    const logic = logicOf(app.model);

    expect(logic.update.mock.calls).toMatchSnapshot();
  });

  it('should be able to cancel a task', async () => {
    const handler = jest.fn();
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
          .fail(this.failHandler)
      }
      cancelTask() {
        return task(this.testTask).cancel();
      }
      *testTask() {
        yield utils.delay(100);
        handler();
        return { hello: 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
      failHandler(...args) {
        return { fail: args };
      }
    }

    const res = runWithTracking({ app: { Logic: TestLogic } });
    const { app, commands } = res;

    app.proc.exec(logicOf(app.model).cancelTask);
    await app.proc.finished();

    expect(handler).toHaveBeenCalledTimes(0);
    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });
});
