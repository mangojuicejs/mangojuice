import { child, context, logicOf, procOf, debounce, utils } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('debounce', () => {
  class TestLogic {
    create() {
      return { a: 0 };
    }
    cancelInc() {
      return debounce(100, this.increment).cancel();
    }
    incrementLeading(inc) {
      return debounce(100, this.increment, { leading: true, trailing: false }).args(inc);
    }
    incrementTrailing(inc) {
      return debounce(100, this.increment, { leading: false, trailing: true }).args(inc);
    }
    incrementLeadingTrailing(inc) {
      return debounce(100, this.increment, { leading: true, trailing: true }).args(inc);
    }
    increment(inc) {
      return { a: this.model.a + inc };
    }
  }

  describe('#create', () => {
    it('should invoke only trailing', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      const res = app.proc.exec(logicOf(app.model).incrementTrailing(10));
      await utils.delay(10);
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 0 });

      await utils.delay(100);
      expect(app.model).toEqual({ a: 10 });
      expect(commandNames).toMatchSnapshot();
      await res;
    });

    it('should delay trailing invoke after multiple calls', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      app.proc.exec(logicOf(app.model).incrementTrailing(10));
      await utils.delay(80);
      app.proc.exec(logicOf(app.model).incrementTrailing(43));
      await utils.delay(80);
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 0 });

      await utils.delay(100);
      expect(app.model).toEqual({ a: 43 });
      expect(commandNames).toMatchSnapshot();
    });

    it('should resolve promise after trailing invokation', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      app.proc.exec(logicOf(app.model).incrementTrailing(10));
      await utils.delay(80);
      const res = app.proc.exec(logicOf(app.model).incrementTrailing(43));
      await utils.delay(50);
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 0 });

      await res;
      expect(app.model).toEqual({ a: 43 });
      expect(commandNames).toMatchSnapshot();
    });

    it('should have only leading invokation', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      app.proc.exec(logicOf(app.model).incrementLeading(10));
      await utils.delay(80);
      const res = app.proc.exec(logicOf(app.model).incrementLeading(43));
      await utils.delay(50);
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 10 });

      await res;
      expect(app.model).toEqual({ a: 10 });
      expect(commandNames).toMatchSnapshot();
    });

    it('should have leading invokation and no trailing if invoked once', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      const res = app.proc.exec(logicOf(app.model).incrementLeadingTrailing(10));
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 10 });

      await res;
      expect(app.model).toEqual({ a: 10 });
    });

    it('should leading and trailing invokations', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      app.proc.exec(logicOf(app.model).incrementLeadingTrailing(10));
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 10 });

      app.proc.exec(logicOf(app.model).incrementLeadingTrailing(20));
      const res = app.proc.exec(logicOf(app.model).incrementLeadingTrailing(30));
      expect(app.model).toEqual({ a: 10 });

      await res;
      expect(app.model).toEqual({ a: 40 });
    });
  });

  describe('#cancel', () => {
    it('should cancel trailing invokation', async () => {
      const { app, commandNames } = await runWithTracking({ app: { Logic: TestLogic } });

      app.proc.exec(logicOf(app.model).incrementLeadingTrailing(10));
      expect(commandNames).toMatchSnapshot();
      expect(app.model).toEqual({ a: 10 });

      app.proc.exec(logicOf(app.model).incrementLeadingTrailing(20));
      app.proc.exec(logicOf(app.model).incrementLeadingTrailing(30));
      app.proc.exec(logicOf(app.model).cancelInc);
      expect(app.model).toEqual({ a: 10 });

      await app.proc.finished();
      expect(app.model).toEqual({ a: 10 });
    });
  });
});
