import { cmd, logicOf, depends, child, procOf } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Computed fields', () => {
  describe('Simple computed', async () => {
    const SharedBlock = {
      createModel: () => ({ e: 0, f: 4, g: 6 }),
      Logic: class SharedBlock {
        computed() {
          return {
            e: () => this.model.f + this.model.g
          };
        }
        @cmd
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: class AppBlock {
        computed() {
          return {
            c: () => this.model.a + this.model.b,
            d: depends(this.shared).compute(() => this.model.a + this.shared.e)
          };
        }
        @cmd
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };

    it('should provide a way to define computed fields of the model', async () => {
      const { app } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.c).toEqual(3);
      expect(app.model.d).toEqual(11);
    });

    it('should reflect changes of model to computed fields', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.c).toEqual(3);
      expect(app.model.d).toEqual(11);

      await app.proc.exec(logicOf(app.model).SetField('a', 5));

      expect(app.model.c).toEqual(7);
      expect(app.model.d).toEqual(15);
    });

    it('should reflect changes of shared to computed fields', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.d).toEqual(11);

      await shared.proc.exec(logicOf(shared.model).SetField('f', 6));

      expect(app.model.d).toEqual(13);
    });

    it('should be able to JSON stringify model with computed', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(JSON.stringify(app.model)).toEqual('{"a":1,"b":2,"c":3,"d":11}');
      expect(JSON.stringify(shared.model)).toEqual('{"e":10,"f":4,"g":6}');
    });
  });

  describe('Computed with dependencies', () => {
    const SharedBlock = {
      createModel: () => ({ e: 0, f: 4, g: 6 }),
      Logic: class SharedBlock {
        computed() {
          return {
            e: () => this.model.f + this.model.g
          };
        }
        @cmd
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: class AppBlock {
        computed() {
          const { model, shared } = this;
          return {
            c: depends(shared).compute(() => shared.f + shared.e + model.a),
            d: depends(shared).compute(() => shared.f + shared.g + model.b)
          };
        }
        @cmd
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const AppParent = {
      createModel: () => ({ a: 1, c: 0, d: 0, child: AppBlock.createModel() }),
      Logic: class AppParent {
        children() {
          return { child: child(AppBlock.Logic) };
        }
        computed() {
          const { model, shared } = this;
          return {
            c: depends(shared, model.child).compute(
              () => shared.f + shared.e + model.a + model.child.a
            ),
            d: depends(shared).compute(() => shared.f + shared.g)
          };
        }
        @cmd
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };

    it('should allow shared dependecy', async () => {
      const { app, shared, commandNames } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.c).toEqual(15);
      expect(app.model.d).toEqual(12);

      await app.proc.exec(logicOf(app.model).SetField('a', 5));

      expect(app.model.c).toEqual(19);
      expect(app.model.d).toEqual(12);

      await app.proc.exec(logicOf(shared.model).SetField('f', 5));

      expect(app.model.c).toEqual(21);
      expect(app.model.d).toEqual(13);
    });

    it('should allow child dependecy', async () => {
      const { app, shared, commandNames, commands } = await runWithTracking({
        app: AppParent,
        shared: SharedBlock
      });

      expect(app.model.c).toEqual(16);
      expect(app.model.d).toEqual(10);

      await app.proc.exec(logicOf(app.model.child).SetField('a', 5));

      expect(app.model.c).toEqual(20);
      expect(app.model.d).toEqual(10);
    });

    it('should remove old observers on re-init of computed fields', async () => {
      const ChildBlock = {
        createModel: () => ({}),
        Logic: class ChildBlock {
        }
      };
      const ParentBlock = {
        createModel: () => ({
          child_1: ChildBlock.createModel(),
          child_2: ChildBlock.createModel(),
          child_3: null
        }),
        Logic: class ParentBlock {
          children() {
            return {
              child_1: child(ChildBlock.Logic),
              child_2: child(ChildBlock.Logic),
              child_3: child(ChildBlock.Logic),
            };
          }
          computed() {
            return {
              test_1: depends(this.model.child_1, this.model.child_2, this.model.child_3).
                compute(() => true),
              test_2: depends(this.model.child_1, this.model.child_2, this.model.child_3).
                compute(() => true),
              test_3: depends(this.model.child_1, this.model.child_2, this.model.child_3).
                compute(() => true)
            }
          }
          @cmd
          SetChild(name, value) {
            return { [name]: value };
          }
        }
      };

      const { app, commandNames } = await runWithTracking({
        app: ParentBlock
      });

      expect(app.model.observers).toEqual(undefined);
      expect(procOf(app.model.child_1).observers).toHaveLength(3);
      expect(procOf(app.model.child_2).observers).toHaveLength(3);

      await app.proc.exec(
        logicOf(app.model).SetChild('child_3', ChildBlock.createModel())
      );

      expect(app.model.observers).toEqual(undefined);
      expect(procOf(app.model.child_1).observers).toHaveLength(3);
      expect(procOf(app.model.child_2).observers).toHaveLength(3);
      expect(procOf(app.model.child_3).observers).toHaveLength(3);
    });

    it('should provide new computed values in "hubAfter"', async () => {
      const handler = jest.fn();
      const ChildBlock = {
        createModel: () => ({ val: 0 }),
        Logic: class ChildBlock {
          @cmd
          SetVal(val) {
            return { val };
          }
        }
      };
      const ParentBlock = {
        createModel: () => ({
          child_1: ChildBlock.createModel(),
          child_2: ChildBlock.createModel(),
          child_3: ChildBlock.createModel()
        }),
        Logic: class ParentBlock {
          children() {
            return {
              child_1: child(ChildBlock.Logic),
              child_2: child(ChildBlock.Logic),
              child_3: child(ChildBlock.Logic),
            };
          }
          computed() {
            return {
              test_1: depends(this.model.child_1, this.model.child_2, this.model.child_3).
                compute((a,b,c) => a.val + b.val + c.val),
              test_2: depends(this.model.child_1, this.model.child_2, this.model.child_3).
                compute((a,b,c) => a.val - b.val - c.val)
            }
          }
          hubAfter() {
            handler(this.model.test_1, this.model.test_2);
          }
        }
      };

      const { app, commandNames } = await runWithTracking({
        app: ParentBlock
      });

      await app.proc.exec(logicOf(app.model.child_1).SetVal(1));
      await app.proc.exec(logicOf(app.model.child_2).SetVal(10));
      await app.proc.exec(logicOf(app.model.child_3).SetVal(100));

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler.mock.calls[0]).toEqual([1, 1]);
      expect(handler.mock.calls[1]).toEqual([11, -9]);
      expect(handler.mock.calls[2]).toEqual([111, -109]);
    });
  });
});
