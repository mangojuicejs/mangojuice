import { Task } from 'mangojuice-core'


describe('Task', () => {
  it('should resolve an object with result and emoty error on success', async () => {
    async function simpleTask() {
      await this.call(Task.delay, 10);
      return { test: 1 };
    }
    const res = await Task.call(simpleTask);

    expect(res).toEqual({ result: { test: 1 }, error: null });
  });

  it('should resolve an object with empty result and error on exception', async () => {
    const error = new Error('test');
    async function simpleTask() {
      throw error;
      await this.call(Task.delay, 10);
      return { test: 1 };
    }
    const res = await Task.call(simpleTask);

    expect(res).toEqual({ result: null, error });
  });

  it('should resolve an object with empty result and error on exception', async () => {
    async function simpleTask() {
      await this.call(Task.delay, 10);
      return { test: 1 };
    }

    const res = Task.call(simpleTask);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
  });

  it('should provide a way to define custom cancel logic in context', async () => {
    const cancleHandler = jest.fn();
    async function simpleTask() {
      this.onCancel(cancleHandler);
      await this.call(Task.delay, 10);
      return { test: 1 };
    }

    const res = Task.call(simpleTask);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(cancleHandler).toHaveBeenCalled();
  });

  it('should reject from error from cancel logic if it happened', async () => {
    const cancelError = new Error('oops');
    const cancleHandler = jest.fn(() => { throw cancelError });
    async function simpleTask() {
      this.onCancel(cancleHandler);
      await this.call(Task.delay, 10);
      return { test: 1 };
    }

    const res = Task.call(simpleTask);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error', cancelError);
    expect(cancleHandler).toHaveBeenCalled();
  });

  it('should provide a way to define custom cancel logic in promise', async () => {
    const cancleHandler = jest.fn();
    async function simpleTask() {
      const func = () => {
        const promise = new Promise(r => setTimeout(r, 10));
        promise[Task.CANCEL] = cancleHandler;
        return promise;
      };
      await this.call(func);
      return { test: 1 };
    }

    const res = Task.call(simpleTask);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(cancleHandler).toHaveBeenCalled();
  });

  it('should cancel tasks deeply', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 10);
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

    const res = Task.call(simpleTask_3);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(someLogic).not.toHaveBeenCalled();
  });

  it('should cancel more than one child tasks', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 10);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_2() {
      await this.call(Task.delay, 30);
      someLogic();
      return { test: 2 };
    }
    async function simpleTask_3() {
      await Promise.all([
        this.call(simpleTask_2),
        this.call(simpleTask_1)
      ]);
      someLogic();
      return { test: 3 };
    }

    const res = Task.call(simpleTask_3);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(someLogic).not.toHaveBeenCalled();
  });

  it('should cancel race correctly', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 10);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_2() {
      await this.call(Task.delay, 3000);
      someLogic();
      return { test: 2 };
    }
    async function simpleTask_3() {
      await Promise.race([
        this.call(simpleTask_2),
        this.call(simpleTask_1)
      ]);
      someLogic();
      await this.call(Task.delay, 1000);
      return { test: 3 };
    }

    const res = Task.call(simpleTask_3);
    await Task.delay(100);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(someLogic).toHaveBeenCalledTimes(2);
  });

  it('should resolve only when all children (forked) tasks resolved', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      this.call(simpleTask_1);
      someLogic();
      return { test: 3 };
    }

    const res = await Task.call(simpleTask_3);

    expect(res).toEqual({ result: { test: 3 }, error: null });
    expect(someLogic).toHaveBeenCalledTimes(2);
  });

  it('should cancel forked tasks', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      this.call(simpleTask_1);
      someLogic();
      return { test: 3 };
    }

    const res = Task.call(simpleTask_3);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(someLogic).toHaveBeenCalledTimes(1);
  });

  it('should handle children cancellation with try/catch', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 100);
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

    const res = Task.call(simpleTask_3);
    res.cancel();

    await expect(res).rejects.toHaveProperty('error.cancelled', true);
    expect(someLogic).toHaveBeenCalledTimes(0);
  });

  it('should not cactch any child task exceptions with try/catch', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 100);
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

    const res = await Task.call(simpleTask_3);

    expect(res).toEqual({ result: { test: 3 }, error: null });
    expect(someLogic).toHaveBeenCalledTimes(0);
  });

  it('should cancel forked tasks inside another task', async () => {
    const someLogic = jest.fn();
    async function simpleTask_1() {
      await this.call(Task.delay, 100);
      someLogic();
      return { test: 1 };
    }
    async function simpleTask_3() {
      const res = this.call(simpleTask_1);
      res.cancel();
      someLogic();
      return { test: 3 };
    }

    const res = await Task.call(simpleTask_3);

    expect(res).toEqual({ result: { test: 3 }, error: null });
    expect(someLogic).toHaveBeenCalledTimes(1);
  });
});
