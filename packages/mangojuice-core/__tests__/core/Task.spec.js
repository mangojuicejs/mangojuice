import { delay, CANCEL } from 'mangojuice-core';
import callTask from 'mangojuice-core/core/task/callTask'


describe('Task', () => {
  it('should resolve an object with result and emoty error on success', async () => {
    let childTask;
    async function simpleTask() {
      childTask = this.call(delay, 10);
      await childTask;
      return { test: 1 };
    }

    const taskCall = callTask(simpleTask);
    const exec = taskCall.exec();
    expect(taskCall.done).toEqual(false);
    expect(childTask.task.done).toEqual(false);

    const res = await exec;
    expect(taskCall.done).toEqual(true);
    expect(childTask.task.done).toEqual(true);
    expect(res).toEqual({ result: { test: 1 }, error: null });
  });

  it('should resolve an object with empty result and error on exception', async () => {
    const error = new Error('test');
    async function simpleTask() {
      throw error;
      await this.call(delay, 10);
      return { test: 1 };
    }
    const res = callTask(simpleTask).exec();

    await expect(res).resolves.toEqual({ result: null, error });
  });

  it('should cancel the task', async () => {
    async function simpleTask() {
      await this.call(delay, 10);
      return { test: 1 };
    }

    const taskCall = callTask(simpleTask);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
  });

  it('should provide a way to define custom cancel logic in context', async () => {
    const cancleHandler = jest.fn();
    async function simpleTask() {
      this.onCancel(cancleHandler);
      await this.call(delay, 10);
      return { test: 1 };
    }

    const taskCall = callTask(simpleTask);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(cancleHandler).toHaveBeenCalled();
  });

  it('should reject from error from cancel logic if it happened', async () => {
    const cancelError = new Error('oops');
    const cancleHandler = jest.fn(() => {
      throw cancelError;
    });
    async function simpleTask() {
      this.onCancel(cancleHandler);
      await this.call(delay, 10);
      return { test: 1 };
    }

    const taskCall = callTask(simpleTask);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error', cancelError);
    expect(cancleHandler).toHaveBeenCalled();
  });

  it('should provide a way to define custom cancel logic in promise', async () => {
    const cancleHandler = jest.fn();
    async function simpleTask() {
      const func = () => {
        const promise = new Promise(r => setTimeout(r, 10));
        promise[CANCEL] = cancleHandler;
        return promise;
      };
      await this.call(func);
      return { test: 1 };
    }

    const taskCall = callTask(simpleTask);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(cancleHandler).toHaveBeenCalled();
  });

  it('should cancel tasks deeply', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 1000);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_2() {
      await this.call(simpleTask_1);
      someLogic();
      return { test: 2 };
    }
    async function simpleTask_3() {
      await this.call(simpleTask_2);
      someLogic();
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = taskCall.exec();
    await delay(10);
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(someLogic).not.toHaveBeenCalled();
  });

  it('should cancel more than one child tasks', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 10);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_2() {
      await this.call(delay, 30);
      someLogic();
      return { test: 2 };
    }
    async function simpleTask_3() {
      await Promise.all([this.call(simpleTask_2), this.call(simpleTask_1)]);
      someLogic();
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(someLogic).not.toHaveBeenCalled();
  });

  it('should cancel race correctly', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 10);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_2() {
      await this.call(delay, 3000);
      someLogic();
      return { test: 2 };
    }
    async function simpleTask_3() {
      await Promise.race([this.call(simpleTask_2), this.call(simpleTask_1)]);
      someLogic();
      await this.call(delay, 1000);
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = taskCall.exec();
    await delay(100);
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(someLogic).toHaveBeenCalledTimes(2);
  });

  it('should resolve only when all children (forked) tasks resolved', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      this.call(simpleTask_1);
      someLogic();
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = await taskCall.exec();

    expect(res).toEqual({ result: { test: 3 }, error: null });
    expect(someLogic).toHaveBeenCalledTimes(2);
  });

  it('should cancel forked tasks', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      this.call(simpleTask_1);
      someLogic();
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(someLogic).toHaveBeenCalledTimes(1);
  });

  it('should handle children cancellation with try/catch', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      try {
        await this.call(simpleTask_1);
      } catch (e) {
        throw e;
      }
      someLogic();
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = taskCall.exec();
    taskCall.cancel();

    await expect(res).resolves.toHaveProperty('error.cancelled', true);
    expect(someLogic).toHaveBeenCalledTimes(0);
  });

  it('should not cactch any child task exceptions with try/catch', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(delay, 100);
      throw new Error('oops');
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      try {
        await this.call(simpleTask_1);
      } catch (e) {
        someLogic();
        throw e;
      }
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = await taskCall.exec();

    expect(res).toEqual({ result: { test: 3 }, error: null });
    expect(someLogic).toHaveBeenCalledTimes(0);
  });

  it('should cancel forked tasks inside another task', async () => {
    const someLogic = jest.fn();
    let childTask;
    async function simpleTask_1() {
      await this.call(delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      childTask = this.call(simpleTask_1);
      childTask.task.cancel();
      someLogic();
      return { test: 3 };
    }

    const taskCall = callTask(simpleTask_3);
    const res = await taskCall.exec();

    expect(childTask.task.cancelled).toEqual(true);
    expect(res).toEqual({ result: { test: 3 }, error: null });
    expect(someLogic).toHaveBeenCalledTimes(1);
  });

  it('should not cancel handler of forked task if it is finished', async () => {
    const someLogic = jest.fn();
    let childTask;
    async function simpleTask_1() {
      await this.call(delay, 100);
      this.onCancel(someLogic);
      return { test: 1 };
    }
    async function simpleTask_3() {
      childTask = this.call(simpleTask_1);
      await this.call(delay, 300);
      someLogic();
      return { test: 3 };
    }

    const parentTask = callTask(simpleTask_3);
    const parentExec = parentTask.exec();
    await childTask;
    expect(childTask.task.done).toEqual(true);

    parentTask.cancel();
    await expect(parentExec).resolves.toHaveProperty('error.cancelled', true);
    expect(parentTask.cancelled).toEqual(true);
    expect(someLogic).toHaveBeenCalledTimes(0);
  });

  it('should provide a way to pass arguments', async () => {
    async function simpleTask(...args) {
      return args;
    }

    const res = await callTask(simpleTask, 1,2,3).exec();
    expect(res).toEqual({"error": null, "result": [1, 2, 3]});
  });

  it('should provide a way to pass custom notify function', async () => {
    async function simpleTask() {
      const res = await this.notify(1,2,3);
      return res;
    }

    const res = await callTask.call({
      notify: (...args) => delay(10).then(() => args)
    }, simpleTask).exec();
    expect(res).toEqual({"error": null, "result": [1, 2, 3]});
  });
});
