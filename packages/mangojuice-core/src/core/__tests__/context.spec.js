import { child, context, logicOf, procOf, message } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('child', () => {
  describe('#create', () => {
    it('should create context and available in child', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c)
      });
      class ChildLogic {
        create() {
          return context(TEST_CONTEXT).get((ctx) => ({
            fromContext: ctx.test.ctx,
            argsFromContext: ctx.test.args
          }))
        }
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { a: child(ChildLogic).create(1,2,3) }
          ];
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });

      expect(app.model).toMatchSnapshot();
    });

    it('should be able to create context after child created', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c)
      });
      class ChildLogic {
        create() {
          return context(TEST_CONTEXT).get((ctx) => ({}))
        }
        update() {
          return context(TEST_CONTEXT).get((ctx) => ({
            fromContext: ctx.test.ctx,
            argsFromContext: ctx.test.args
          }))
        }
      }
      class Test {
        create() {
          return [
            { a: child(ChildLogic).create(1,2,3) },
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { a: child(ChildLogic).update(() => ({})) },
          ];
        }
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test }, expectErrors: true });

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    })

    it('should destroy context with logic which created a context', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) }
          ];
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });
      const processes = [
        procOf(app.model),
        procOf(app.model.ctx),
        procOf(app.model.ctx.test),
        procOf(app.model.ctx.anotherTest)
      ];
      processes[0].destroy();

      expect(app.model).toMatchSnapshot();
      expect(processes.map(x => x.destroyed)).toMatchSnapshot();
    });
    it('should be able to create same context in different subtrees', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class ChildLogic {
        create(...args) {
          return { ctx: context(TEST_CONTEXT).create(...args) }
        }
      }
      class Test {
        create() {
          return {
            a: child(ChildLogic).create(1,2,3),
            b: child(ChildLogic).create(3,2,1)
          };
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });

      expect(app.model).toMatchSnapshot();
    });
    it('should throw an error if context already created - in root', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { anotherCtx: context(TEST_CONTEXT).create(3,2,1) }
          ];
        }
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test }, expectErrors: true });

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    })
    it('should override a parent context if same created in child', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class ChildLogic {
        create(...args) {
          return [
            { ctx: context(TEST_CONTEXT).create(...args) },
            { child: child(AnotherChildLogic).create() }
          ]
        }
        updateFromContext() {
          return context(TEST_CONTEXT).get((ctx) => {
            fromContext: ctx.test.args
          })
        }
      }
      class AnotherChildLogic {
        create(...args) {
          return context(TEST_CONTEXT).get((ctx) => ({
            fromContext: ctx.test.args
          }))
        }
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { child: child(ChildLogic).create(2,2,2) },
            { anotherChild: child(AnotherChildLogic).create(1,1,1) },
          ];
        }
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test } });
      procOf(app.model.child).exec(logicOf(app.model.child).updateFromContext);

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    });
    it('should be able to create multiple contexts', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
      });
      const ANOTHER_CONTEXT = (a, b, c) => ({
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class ChildLogic {
        create(...args) {
          return [
            context(TEST_CONTEXT).get((ctx) => ({
              fromTestContext: ctx.test.args
            })),
            context(ANOTHER_CONTEXT).get((ctx) => ({
              fromAnotherContext: ctx.anotherTest.args
            }))
          ]
        }
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { anotherCtx: context(ANOTHER_CONTEXT).create(3,2,1) },
            { child: child(ChildLogic).create() }
          ];
        }
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test } });

      expect(app.model).toMatchSnapshot();
    });
  });

  describe('#update', () => {
    it('should send update context from root', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class ChildLogic {
        create() {
          return context(TEST_CONTEXT).get((ctx) => ({
            fromContext: ctx.test.ctx,
            argsFromContext: ctx.test.args
          }))
        }
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { a: child(ChildLogic).create(1,2,3) },
            context(TEST_CONTEXT).update(() => ({ test: 'event' }))
          ];
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });

      expect(app.model).toMatchSnapshot();
    });
    it('should send update context from child', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return { ...evt } }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
        anotherTest: child(ContextChildLogic).create(b, c, a)
      });
      class ChildLogic {
        create() {
          return context(TEST_CONTEXT).get((ctx) => ({
            fromContext: ctx.test.ctx,
            argsFromContext: ctx.test.args
          }))
        }
        updateContext() {
          return context(TEST_CONTEXT).update(() => ({ test: 'event' }));
        }
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { a: child(ChildLogic).create(1,2,3) },
          ];
        }
      }

      const { app } = runWithTracking({ app: { Logic: Test } });
      procOf(app.model.a).exec(logicOf(app.model.a).updateContext);

      expect(app.model).toMatchSnapshot();
    });
  });

  describe('#subscribe', () => {
    it('should not catch messages from context by default', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return evt }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
      });
      class ChildLogic {
        update = jest.fn()
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { child: child(ChildLogic).create() },
            context(TEST_CONTEXT).update(() => ({ some: 'update' }))
          ];
        }
        update = jest.fn()
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test } });
      const childLogic = logicOf(app.model.child);

      expect(app.model).toMatchSnapshot();
      expect(childLogic.update).toHaveBeenCalledTimes(0);
      expect(app.proc.logic.update).toHaveBeenCalledTimes(1);
    });

    it('should catch messages from context if subscribed', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return evt }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
      });
      class ChildLogic {
        create() {
          return context(TEST_CONTEXT).subscribe()
        }
        update = jest.fn()
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { child: child(ChildLogic).create() },
            context(TEST_CONTEXT).update(() => ({ some: 'update' }))
          ];
        }
        update = jest.fn()
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test } });
      const childLogic = logicOf(app.model.child);

      expect(app.model).toMatchSnapshot();
      expect(childLogic.update).toHaveBeenCalledTimes(1);
      expect(childLogic.update.mock.calls[0]).toMatchSnapshot();
      expect(app.proc.logic.update).toHaveBeenCalledTimes(1);
    });

    it('should remove subscription when logic destroyed', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return evt }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
      });
      class ChildLogic {
        create() { return context(TEST_CONTEXT).subscribe() }
        update = jest.fn()
      }
      class Test {
        create() {
          return [
            { ctx: context(TEST_CONTEXT).create(3,2,1) },
            { child: child(ChildLogic).create() }
          ];
        }
        update = jest.fn()
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test } });
      const childLogic = logicOf(app.model.child);
      app.proc.exec({ child: null });
      app.proc.exec(context(TEST_CONTEXT).update(() => ({ some: 'update' })));

      expect(app.model).toMatchSnapshot();
      expect(childLogic.update).toHaveBeenCalledTimes(0);
      expect(procOf(app.model.ctx).handlers).toEqual([]);
      expect(app.proc.logic.update).toHaveBeenCalledTimes(1);
    });
    it('should throw an error if given context is not defined', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return evt }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
      });
      class ChildLogic {
        create() { return context(TEST_CONTEXT).subscribe() }
      }
      class Test {
        create() {
          return [
            { child: child(ChildLogic).create() }
          ];
        }
        update = jest.fn()
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test }, expectErrors: true });

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    });
  });

  describe('#get', () => {
    it('should throw an error if given context is not defined', () => {
      class ContextChildLogic {
        create(...args) { return { ctx: 'yeah', args } }
        update(evt) { return evt }
      }
      const TEST_CONTEXT = (a, b, c) => ({
        test: child(ContextChildLogic).create(a, b, c),
      });
      class ChildLogic {
        create() { return context(TEST_CONTEXT).get(() => ({})) }
      }
      class Test {
        create() {
          return [
            { child: child(ChildLogic).create() }
          ];
        }
        update = jest.fn()
      }

      const { app, errors } = runWithTracking({ app: { Logic: Test }, expectErrors: true });

      expect(app.model).toMatchSnapshot();
      expect(errors).toMatchSnapshot();
    });
  });
});
