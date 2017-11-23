import {
  cmd,
  logicOf,
  depends,
  child,
  task,
  delay,
  observe
} from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Errors handling', () => {
  describe('While sync command execution', () => {
    const testError = new Error('Ooops!');
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: class AppBlock {
        @cmd
        SetField(name, value) {
          throw testError;
          return { [name]: value };
        }
        @cmd
        SomeBatch(name, value) {
          throw testError;
        }
        @cmd
        SomeTaskCreator(name, value) {
          throw testError;
        }
      }
    };

    it('shuold notify logger about the error on update', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(logicOf(app.model).SetField('a', 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('shuold notify logger about the error on batch', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(logicOf(app.model).SomeBatch('a', 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('shuold notify logger about the error on exec', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(logicOf(app.model).SomeTaskCreator('a', 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });
  });

  describe('While asynnc command execution (in task)', () => {
    const testError = new Error('Ooops!');
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: class AppBlock {
        @cmd
        SomeTaskCreator(name, value) {
          return task(async function() {
            await this.call(delay, 100);
            throw testError;
          });
        }
        @cmd
        HandledTaskCreator(name, value) {
          return task(async function() {
            await this.call(delay, 100);
            throw testError;
          }).fail(this.SomeFailHandler);
        }
        @cmd
        SomeFailHandler() {}
      }
    };

    it('shuold notify logger about the error if fail cmd not defined', async () => {
      const { app, errors } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(logicOf(app.model).SomeTaskCreator('a', 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('shuold NOT notify logger about the error if fail cmd defined', async () => {
      const { app, errors, commandNames } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      expect(errors).toHaveLength(0);
      await app.proc.exec(logicOf(app.model).HandledTaskCreator('a', 12));
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
        Logic: class TestLogic {
          config() {
            throw testError;
          }
        }
      };

      await expect(
        runWithTracking({
          app: AppBlock,
          expectErrors: true
        })
      ).rejects.toBe(testError);
    });
  });

  describe('In special logic functions', () => {
    const testError = new Error('Ooops!');

    it('should log an error from model obaerver', async () => {
      const ChildBlock = {
        createModel: () => ({}),
        Logic: class ChildBlock {
          @cmd
          ModelUpdate() {
            return { test: 'passed' };
          }
        }
      };
      const ErroredObsever = () => {
        throw testError;
      };

      const { app, errors, commandNames } = await runWithTracking({
        app: ChildBlock,
        expectErrors: true
      });

      observe(app.model, null, ErroredObsever);
      await app.proc.exec(ChildBlock.Logic.prototype.ModelUpdate);

      expect(app.model).toEqual({ test: 'passed' });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });

    it('should log an error from hub', async () => {
      const ChildBlock = {
        createModel: () => ({}),
        Logic: class ChildBlock {
          @cmd
          HubError() {}
          @cmd
          HubNoError() {
            return { test: 'passed' };
          }
        }
      };
      const AppBlock = {
        createModel: () => ({ child: ChildBlock.createModel() }),
        Logic: class TestLogic {
          children() {
            return { child: ChildBlock.Logic };
          }
          hub(cmd) {
            if (cmd.is(logicOf(this.model.child).HubError)) {
              throw testError;
            } else {
              return this.HubHandler;
            }
          }
          @cmd
          HubHandler() {}
        }
      };

      const { app, errors, commandNames } = await runWithTracking({
        app: AppBlock,
        expectErrors: true
      });

      await app.proc.exec(logicOf(app.model.child).HubNoError);
      await app.proc.exec(logicOf(app.model.child).HubError);
      await app.proc.exec(logicOf(app.model.child).HubNoError);

      expect(app.model).toEqual({ child: { test: 'passed' } });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
      expect(commandNames).toEqual([
        'ChildBlock.HubNoError',
        'TestLogic.HubHandler',
        'ChildBlock.HubError',
        'ChildBlock.HubNoError',
        'TestLogic.HubHandler'
      ]);
    });
  });
});
