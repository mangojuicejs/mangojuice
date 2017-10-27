import { cmd, cancel, logicOf, depends, child, task, delay } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe('Exec tasks', () => {
  it('should exec task and exec success cmd with result on success', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(function() { return { test: 123 }; })
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    await app.proc.exec(logicOf(app.model).SuccessTask);

    expect(app.model).toEqual({ test: 123 });
    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler'
    ]);
  });

  it('should exec task and exec fail cmd with error on fail', async () => {
    const error = new Error('oops');
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd FailTask() {
          return task(function() {
              throw error;
              return { test: 123 };
            })
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler() {}
        @cmd FailHandler(e) { return { error: e }; }
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    await app.proc.exec(logicOf(app.model).FailTask);

    expect(app.model).toEqual({ error });
    expect(commandNames).toEqual([
      'Block.FailTask',
      'Block.FailHandler'
    ]);
  });

  it('should provide a way to cancel a task', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(async function() {
              await this.call(delay, 1000);
              return { test: 123 };
            })
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler() {}
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    app.proc.exec(logicOf(app.model).SuccessTask);
    await delay(100);
    await app.proc.exec(cancel(logicOf(app.model).SuccessTask));
    await delay(10);

    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessTask.Cancel',
      'Block.SuccessTask.Cancelled',
    ]);
  });

  it('should receive arguments from command by default', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(function(ctx, ...args) { return { test: args }; })
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    await app.proc.exec(logicOf(app.model).SuccessTask(1,2,3));

    expect(app.model).toEqual({ test: [1,2,3] });
    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler'
    ]);
  });

  it('should receive overriden arguments if defined', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(function(ctx, ...args) {
              return { test: args };
            })
            .args(3,2,1)
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    await app.proc.exec(logicOf(app.model).SuccessTask(1,2,3));

    expect(app.model).toEqual({ test: [3,2,1] });
    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler'
    ]);
  });

  it('should user custom executor if defined', async () => {
    const customEngine = jest.fn((func, ...args) => {
      const result = func(...args);
      return Promise.resolve({ result, error: null });
    });
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(function(ctx, ...args) {
              return { test: args };
            })
            .engine(customEngine)
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    await app.proc.exec(logicOf(app.model).SuccessTask(1,2,3));

    expect(customEngine).toHaveBeenCalledTimes(1);
    expect(app.model).toEqual({ test: [1,2,3] });
    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler'
    ]);
  });

  it('should not cancel prev task if "every" option provided', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(async function() {
              await this.call(delay, 100);
              return { test: 123 };
            })
            .multithread()
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    const proms = [
      app.proc.exec(logicOf(app.model).SuccessTask),
      app.proc.exec(logicOf(app.model).SuccessTask),
      app.proc.exec(logicOf(app.model).SuccessTask)
    ];
    await Promise.all(proms);

    expect(app.model).toEqual({ test: 123 });
    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessTask',
      'Block.SuccessTask',
      'Block.SuccessHandler',
      'Block.SuccessHandler',
      'Block.SuccessHandler',
    ]);
  });

  it('should cancel a prev inprogress task for single proc in field', async () => {
    const handler = jest.fn();
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(async function() {
              await this.call(delay, 100);
              handler();
              return { test: 123 };
            })
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const { app, commandNames } = await runWithTracking({ app: Block });
    app.proc.exec(logicOf(app.model).SuccessTask);
    await delay(10);
    await app.proc.exec(logicOf(app.model).SuccessTask);

    expect(app.model).toEqual({ test: 123 });
    expect(commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessTask',
      'Block.SuccessTask.Cancelled',
      'Block.SuccessHandler'
    ]);
  });

  it('should not cancel all by default', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(async function() {
              await this.call(delay, 500);
              return { test: 123 };
            })
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler() {}
        @cmd FailHandler() {}
      }
    };
    const runOne = await runWithTracking({ app: Block });
    const runTwo = await runWithTracking({ app: Block });
    const runThree = await runWithTracking({ app: Block });

    const promOne = runOne.app.proc.exec(logicOf(runOne.app.model).SuccessTask);
    const promTwo = runTwo.app.proc.exec(logicOf(runTwo.app.model).SuccessTask);
    const promThree = runThree.app.proc.exec(logicOf(runThree.app.model).SuccessTask);
    await delay(100);
    await runThree.app.proc.exec(cancel(logicOf(runThree.app.model).SuccessTask));
    await delay(10);
    await Promise.all([ promOne, promThree, promTwo ]);

    expect(runOne.commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler'
    ]);
    expect(runTwo.commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler'
    ]);
    expect(runThree.commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessTask.Cancel',
      'Block.SuccessTask.Cancelled'
    ]);
  });

  it('should cancel all executing tasks in a process in "every" mode', async () => {
    const Block = {
      createModel: () => ({}),
      Logic: class Block {
        @cmd SuccessTask() {
          return task(async function() {
              await this.call(delay, 500);
              return { test: 123 };
            })
            .multithread()
            .success(this.SuccessHandler)
            .fail(this.FailHandler)
        }
        @cmd SuccessHandler(res) { return res }
        @cmd FailHandler() {}
      }
    };
    const runOne = await runWithTracking({ app: Block });
    const runTwo = await runWithTracking({ app: Block });
    const proms = [
      runOne.app.proc.exec(logicOf(runOne.app.model).SuccessTask),
      runOne.app.proc.exec(logicOf(runOne.app.model).SuccessTask),
      runOne.app.proc.exec(logicOf(runOne.app.model).SuccessTask),
      runTwo.app.proc.exec(logicOf(runTwo.app.model).SuccessTask)
    ];
    await delay(10);
    await runOne.app.proc.exec(cancel(logicOf(runOne.app.model).SuccessTask));
    await Promise.all(proms);

    expect(runTwo.app.model).toEqual({ test: 123 });
    expect(runTwo.commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessHandler',
    ]);
    expect(runOne.commandNames).toEqual([
      'Block.SuccessTask',
      'Block.SuccessTask',
      'Block.SuccessTask',
      'Block.SuccessTask.Cancel',
      'Block.SuccessTask.Cancelled',
      'Block.SuccessTask.Cancelled',
      'Block.SuccessTask.Cancelled',
    ]);
  });
});
