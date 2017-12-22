import {
  cmd,
  logicOf,
  depends,
  child,
  task,
  delay,
  observe,
} from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Command enhancers', () => {
  describe('throttle', () => {
    const AppBlock = {
      createModel: () => ({ a: 0 }),
      Logic: class AppBlock {
        @cmd({ throttle: 100 })
        Increment(inc) {
          return { a: this.model.a + inc };
        }

        @cmd({ throttle: 100, noInitCall: true })
        IncrementNoInitCall(inc) {
          return { a: this.model.a + inc };
        }
      }
    };
    const ParentBlock = {
      createModel: () => ({ child: AppBlock.createModel() }),
      Logic: class ParentBlock {
        children() {
          return { child: AppBlock.Logic };
        }
        hub(cmd) {
          return this.Handler;
        }
        @cmd
        Handler() {}
      }
    };

    it('should execute original command instantly for a first time', async () => {
      const { app, commandNames } = await runWithTracking({ app: AppBlock });

      await app.proc.exec(logicOf(app.model).Increment(10));
      expect(commandNames).toEqual([
        'AppBlock.Increment'
      ]);

      await delay(110);
      expect(app.model).toEqual({ a: 10 });
      expect(commandNames).toEqual([
        'AppBlock.Increment',
      ]);
    });

    it('should call throttled func with latest args', async () => {
      const { app, commandNames } = await runWithTracking({ app: ParentBlock });

      app.proc.exec(logicOf(app.model.child).Increment(10));
      await delay(10);
      app.proc.exec(logicOf(app.model.child).Increment(11));
      await delay(10);
      await app.proc.exec(logicOf(app.model.child).Increment(12));

      expect(commandNames).toEqual([
        'AppBlock.Increment',
        'ParentBlock.Handler',
        'AppBlock.Increment',
        'ParentBlock.Handler'
      ]);
      expect(app.model).toEqual({ child: { a: 22 } })
    });

    it('should wait another N throttle ms after first throttled exec', async () => {
      const { app, commandNames } = await runWithTracking({ app: ParentBlock });

      app.proc.exec(logicOf(app.model.child).Increment(100));
      await delay(10);
      app.proc.exec(logicOf(app.model.child).Increment(11));
      await delay(10);
      app.proc.exec(logicOf(app.model.child).Increment(210));
      await delay(100);
      app.proc.exec(logicOf(app.model.child).Increment(13));
      await delay(10);
      app.proc.exec(logicOf(app.model.child).Increment(14));
      await delay(50);
      await app.proc.exec(logicOf(app.model.child).Increment(311));

      expect([app.model, ...commandNames]).toEqual([
        { child: { a: 621 } },
        'AppBlock.Increment',
        'ParentBlock.Handler',
        'AppBlock.Increment',
        'ParentBlock.Handler',
        'AppBlock.Increment',
        'ParentBlock.Handler'
      ]);
    });

    it('should provide a way to not do an init call of the command', async () => {
      const { app, commandNames } = await runWithTracking({ app: AppBlock });

      app.proc.exec(logicOf(app.model).IncrementNoInitCall(10));
      await delay(10);
      expect(commandNames).toEqual([]);

      await delay(110);
      expect([ app.model, ...commandNames ]).toEqual([
        { a: 10 },
        'AppBlock.IncrementNoInitCall'
      ]);

      app.proc.exec(logicOf(app.model).IncrementNoInitCall(10));
      await delay(10);
      expect([ app.model, ...commandNames ]).toEqual([
        { a: 10 },
        'AppBlock.IncrementNoInitCall'
      ]);

      await delay(110);
      expect([ app.model, ...commandNames ]).toEqual([
        { a: 20 },
        'AppBlock.IncrementNoInitCall',
        'AppBlock.IncrementNoInitCall',
      ]);
    });
  });

  describe('debounce', () => {
    const AppBlock = {
      createModel: () => ({ a: 0 }),
      Logic: class AppBlock {
        @cmd({ debounce: 100 })
        Increment(inc) {
          return { a: this.model.a + inc };
        }

        @cmd({ debounce: 100, noInitCall: true })
        IncrementNoInitCall(inc) {
          return { a: this.model.a + inc };
        }
      }
    };
    const ParentBlock = {
      createModel: () => ({ child: AppBlock.createModel() }),
      Logic: class ParentBlock {
        children() {
          return { child: AppBlock.Logic };
        }
        hub(cmd) {
          return this.Handler;
        }
        @cmd
        Handler() {}
      }
    };

    it('should execute original command instantly for a first time', async () => {
      const { app, commandNames } = await runWithTracking({ app: AppBlock });

      const res = app.proc.exec(logicOf(app.model).Increment(10));
      await delay(10);
      expect(commandNames).toEqual([
        'AppBlock.Increment',
      ]);

      await delay(100)
      await res;
      expect(app.model).toEqual({ a: 10 });
      expect(commandNames).toEqual([
        'AppBlock.Increment'
      ]);
    });

    it('should call debounced func with latest args', async () => {
      const { app, commandNames } = await runWithTracking({ app: ParentBlock });

      app.proc.exec(logicOf(app.model.child).Increment(10));
      await delay(70);
      app.proc.exec(logicOf(app.model.child).Increment(11));
      await delay(70);
      app.proc.exec(logicOf(app.model.child).Increment(12));
      await delay(70);
      await app.proc.exec(logicOf(app.model.child).Increment(13));

      expect(app.model).toEqual({ child: { a: 23 } });
      expect(commandNames).toEqual([
        'AppBlock.Increment',
        'ParentBlock.Handler',
        'AppBlock.Increment',
        'ParentBlock.Handler'
      ]);
    });

    it('should wait another N debounce ms after first debounced exec', async () => {
      const { app, commandNames } = await runWithTracking({ app: ParentBlock });

      app.proc.exec(logicOf(app.model.child).Increment(100));
      await delay(70);
      app.proc.exec(logicOf(app.model.child).Increment(11));
      await delay(70);
      app.proc.exec(logicOf(app.model.child).Increment(210));
      await delay(120);
      app.proc.exec(logicOf(app.model.child).Increment(13));
      await delay(70);
      app.proc.exec(logicOf(app.model.child).Increment(14));
      await delay(70);
      app.proc.exec(logicOf(app.model.child).Increment(311));
      await delay(120);

      expect(app.model).toEqual({ child: { a: 621 } });
      expect(commandNames).toEqual([
        'AppBlock.Increment',
        'ParentBlock.Handler',
        'AppBlock.Increment',
        'ParentBlock.Handler',
        'AppBlock.Increment',
        'ParentBlock.Handler'
      ]);
    });

    it('should provide a way to not do an init call of the command', async () => {
      const { app, commandNames } = await runWithTracking({ app: AppBlock });

      app.proc.exec(logicOf(app.model).IncrementNoInitCall(10));
      await delay(10);
      expect(commandNames).toEqual([
      ]);

      await delay(50);
      app.proc.exec(logicOf(app.model).IncrementNoInitCall(10));
      expect([ app.model, ...commandNames ]).toEqual([
        { a: 0 },
      ]);

      await delay(50);
      app.proc.exec(logicOf(app.model).IncrementNoInitCall(10));
      expect([ app.model, ...commandNames ]).toEqual([
        { a: 0 },
      ]);

      await delay(110);
      const res = app.proc.exec(logicOf(app.model).IncrementNoInitCall(10));
      expect([ app.model, ...commandNames ]).toEqual([
        { a: 10 },
        'AppBlock.IncrementNoInitCall'
      ]);

      await res;
      expect(app.model).toEqual({ a: 20 });
    });
  });
});
