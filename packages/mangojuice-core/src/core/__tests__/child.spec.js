import { child, logicOf, procOf } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


class ChildLogic {
  create = jest.fn((...args) => ({ hello: 'child', args }))
  update = jest.fn()
}

describe('child', () => {
  describe('#create', () => {
    it('should create child model', async () => {
      class Test {
        create() {
          return { a: child(ChildLogic).create(1,2,3) }
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });

      expect(app.model).toMatchSnapshot();
      expect(logicOf(app.model.a).create).toHaveBeenCalledTimes(1);
    });

    it('should create child model and replace existing one', async () => {
      class Test {
        create() {
          return { a: child(ChildLogic).create(1,2,3) }
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });
      const oldProc = procOf(app.model.a);
      app.proc.exec({ a: child(ChildLogic).create(4,5,6) });

      expect(app.model).toMatchSnapshot();
      expect(logicOf(app.model.a).create).toHaveBeenCalledTimes(1);
      expect(oldProc.destroyed).toEqual(true);
    });

    it('should create child models in an array', () => {
      class Test {
        create() {
          return { a: [
            child(ChildLogic).create(1,2,3),
            child(ChildLogic).create(4,5,6),
            child(ChildLogic).create(7,8,9),
            'asd',
            12
          ] }
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });

      expect(app.model).toMatchSnapshot()
    });

    it('should replace child arrays in an array', () => {
      class Test {
        create() {
          return { a: [
            child(ChildLogic).create(1,2,3),
            child(ChildLogic).create(4,5,6),
            child(ChildLogic).create(7,8,9)
          ] }
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });
      const oldProcs = app.model.a.map(procOf);
      app.proc.exec({ a: [
        child(ChildLogic).create(1,1,1),
        child(ChildLogic).create(2,2,2),
      ] });

      expect(app.model).toMatchSnapshot()
      expect(oldProcs.map(x => x.destroyed)).toMatchSnapshot();
    });
  });

  describe('#update', () => {
    it('should update child model', async () => {
      class Test {
        create() {
          return { a: child(ChildLogic).create(1,2,3) }
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });
      logicOf(app.model.a).update.mockImplementation(msg => ({ ...msg }));
      app.proc.exec({ a: child(ChildLogic).update(() => ({ hey: 'there' })) });

      expect(app.model).toMatchSnapshot();
    });
    it('should rise an error if model does not exists', async () => {
      class Test {
        create() {
          return { a: child(ChildLogic).create(1,2,3) }
        }
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test }, expectErrors: true });
      logicOf(app.model.a).update.mockImplementation(msg => ({ ...msg }));
      app.proc.exec({ b: child(ChildLogic).update(() => ({ hey: 'there' })) });

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    });
    it('should rise an error if model does not exists', async () => {
      class DifferentChild {}
      class Test {
        create() {
          return { a: child(DifferentChild).create(1,2,3) }
        }
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test }, expectErrors: true });
      app.proc.exec({ a: child(ChildLogic).update(() => ({ hey: 'there' })) });

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    });
  });
});
