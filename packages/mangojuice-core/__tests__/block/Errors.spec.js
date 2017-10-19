import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe('Errors handling', () => {
  describe('While sync command execution', () => {
    const testError = new Error('Ooops!');
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",

        @Cmd.update
        SetField(name, value) {
          throw testError;
          return { [name]: value };
        },

        @Cmd.update
        SomeBatch(name, value) {
          throw testError;
        },

        @Cmd.task
        SomeTaskCreator(name, value) {
          throw testError;
        },
      }
    };

    it('shuold notify logger about the error on update', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(AppBlock.Logic.SetField("a", 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('shuold notify logger about the error on batch', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(AppBlock.Logic.SomeBatch("a", 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('shuold notify logger about the error on exec', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(AppBlock.Logic.SomeTaskCreator("a", 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });
  });

  describe('While asynnc command execution (in task)', () => {
    const testError = new Error('Ooops!');
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",

        @Cmd.task
        SomeTaskCreator(name, value) {
          return Task.create(async function() {
            await this.call(Task.delay, 100);
            throw testError;
          });
        },

        @Cmd.task
        HandledTaskCreator(name, value) {
          return Task.create(async function() {
            await this.call(Task.delay, 100);
            throw testError;
          }).fail(this.SomeFailHandler);
        },

        @Cmd.batch
        SomeFailHandler() {
        }
      }
    };

    it('shuold notify logger about the error if fail cmd not defined', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(AppBlock.Logic.SomeTaskCreator("a", 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('shuold NOT notify logger about the error if fail cmd defined', async () => {
      const { app, errors, commandNames } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(AppBlock.Logic.HandledTaskCreator("a", 12));
      expect(errors).toHaveLength(0);
      expect(commandNames).toEqual([
        'AppBlock.HandledTaskCreator',
        'AppBlock.SomeFailHandler'
      ]);
    });
  });

  describe('On init stage', () => {
    const testError = new Error('Ooops!');

    it('should throw an error while running if config have error', async () => {
      const AppBlock = {
        createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
        Logic: {
          config() {
            throw testError;
          }
        }
      };

      await expect(runWithTracking({
        app: AppBlock,
        expectErrors: true
      })).rejects.toBe(testError);
    })
  });
});
