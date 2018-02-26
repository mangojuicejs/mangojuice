import { memoized, logicOf, procOf } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('memoized', () => {
  it('should call non-memoized compute field on each get', async () => {
    const computeFn = jest.fn(() => 123);
    class Test {
      create() {
        return { a: computeFn }
      }
    }

    const { app } = await runWithTracking({ app: { Logic: Test } });
    app.model.a;
    app.model.a;
    app.model.a;

    expect(app.model).toMatchSnapshot();
    expect(computeFn).toHaveBeenCalledTimes(4);
  });

  it('should call memoized compute field only on first get', async () => {
    const computeFn = jest.fn(() => 123);
    class Test {
      create() {
        return { a: memoized(computeFn) }
      }
    }

    const { app } = await runWithTracking({ app: { Logic: Test } });
    app.model.a;
    app.model.a;
    app.model.a;

    expect(app.model).toMatchSnapshot();
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it('should reset cached value when model changed', async () => {
    let computeFn;
    class Test {
      create() {
        computeFn = jest.fn(() => this.model.b + 1);
        return { a: memoized(computeFn), b: 1 };
      }
    }

    const { app } = await runWithTracking({ app: { Logic: Test } });
    app.model.a;
    app.model.a;
    app.model.a;
    expect(app.model).toMatchSnapshot();
    expect(computeFn).toHaveBeenCalledTimes(1);

    app.proc.exec({ b: 10 });
    app.model.a;
    app.model.a;
    app.model.a;
    expect(app.model).toMatchSnapshot();
    expect(computeFn).toHaveBeenCalledTimes(2);
  });
});
