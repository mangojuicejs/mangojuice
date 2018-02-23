import { child, procOf, handle, message, Process, run, DefaultLogger } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('run', () => {
  it('should return a model with attached process', async () => {
    class Test {
      create() { return { a: 123 } }
    }

    const model = run(Test);

    expect(procOf(model) instanceof Process).toEqual(true);
    expect(model).toEqual({ a: 123 });
  });

  it('should accept block as first argument', async () => {
    class Test {
      create() { return { a: 123 } }
    }

    const model = run({ Logic: Test });

    expect(procOf(model) instanceof Process).toEqual(true);
    expect(model).toEqual({ a: 123 });
  });

  it('should attach to provided model', async () => {
    class Test {
      create() { return { a: 123 } }
    }

    const model = run(Test, { model: { b: 321 } });

    expect(procOf(model) instanceof Process).toEqual(true);
    expect(model).toEqual({ a: 123, b: 321 });
  });

  it('should accept args to create', async () => {
    class Test {
      create(...args) { return { a: args } }
    }

    const model = run(Test, { args: [1,2,3] });

    expect(procOf(model) instanceof Process).toEqual(true);
    expect(model).toEqual({ a: [1,2,3] });
  });

  it('should accept custom logger class', async () => {
    class CustomLogger extends DefaultLogger {
      onStartExec = jest.fn()
    }
    class Test {
      create(...args) { return { a: args } }
    }

    const model = run(Test, { logger: new CustomLogger() });
    const proc = procOf(model);
    proc.exec({ a: 123 });

    expect(proc.logger.onStartExec).toHaveBeenCalledTimes(2);
  });

  it('should accept custom Process class', async () => {
    class CustomProcess extends Process {
      exec(...args) {
        super.exec(...args);
        this.customMethod();
      }
      customMethod = jest.fn()
    }
    class Test {
      create(...args) { return { a: args } }
    }

    const model = run(Test, { Process: CustomProcess });
    const proc = procOf(model);
    proc.exec({ a: 123 });

    expect(proc.customMethod).toHaveBeenCalledTimes(3);
  });
});
