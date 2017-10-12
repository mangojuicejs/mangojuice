import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe("Block specs", () => {
  describe("Init commands execution", () => {
    const AsyncTaskDelayed = function() {
      return this.call(Task.delay, 50);
    };
    const SharedBlock = {
      createModel: () => ({}),
      Logic: {
        name: "SharedBlock",
        config() {
          return { initCommands: [this.FromInitOneCmd()] };
        },
        port({ exec }) {
          return exec(this.FromPortAsync);
        },
        @Cmd.execLatest
        FromPortAsync() {
          return Task.create(AsyncTaskDelayed).success(
            this.FromPortAsync_Success
          );
        },
        @Cmd.nope FromInitOneCmd() {},
        @Cmd.nope FromPortAsync_Success() {}
      }
    };
    const BlockB = {
      createModel: () => ({}),
      Logic: {
        name: "BlockB",
        config({ subscribe, shared }) {
          return { initCommands: [this.FromInitOneCmd] };
        },
        @Cmd.nope FromInitOneCmd() {}
      }
    };
    const BlockA = {
      createModel: () => ({
        b_1: BlockB.createModel(),
        b_2: BlockB.createModel()
      }),
      Logic: {
        name: "BlockA",
        config() {
          return {
            initCommands: [this.FromInitOneCmd, this.FromInitTwoCmd(1, 2, 3)],
          };
        },
        children({ nest }) {
          return {
            b_1: nest(BlockB.Logic).handler(this.HandleB_1),
            b_2: nest(BlockB.Logic).handler(this.HandleB_2)
          }
        },
        port({ model, shared, destroy, exec }) {
          Utils.handleModelChanges(shared, cmd => {
            exec(this.FromSubCmd);
          }, destroy);

          return Promise.all([
            exec(this.FromSubCmd),
            exec(this.FromPortCmd),
            exec(this.FromPortAsync())
          ]);
        },
        @Cmd.batch
        FromPortCmd() {
          return [this.FromPortCmd_1, this.FromPortCmd_2()];
        },
        @Cmd.execLatest
        FromPortAsync() {
          return Task.create(AsyncTaskDelayed).success(
            this.FromPortAsync_Success
          );
        },
        @Cmd.batch FromPortCmd_1() {},
        @Cmd.batch FromPortCmd_2() {},
        @Cmd.nope FromPortAsync_Success() {},
        @Cmd.nope FromInitOneCmd() {},
        @Cmd.nope FromInitTwoCmd() {},
        @Cmd.nope FromSubCmd() {},
        @Cmd.nope HandleB_1() {},
        @Cmd.nope HandleB_2() {}
      }
    };

    it("should execute init commands in correct order and finish", async () => {
      const { app, shared, commandNames } = await runWithTracking({
        app: BlockA,
        shared: SharedBlock
      });

      expect(commandNames).toEqual([
        "SharedBlock.FromPortAsync",
        "SharedBlock.FromInitOneCmd",
        "BlockB.FromInitOneCmd",
        "BlockA.HandleB_1",
        "BlockA.HandleB_1",
        "BlockB.FromInitOneCmd",
        "BlockA.HandleB_2",
        "BlockA.HandleB_2",
        "BlockA.FromSubCmd",
        "BlockA.FromPortCmd",
        "BlockA.FromPortCmd_1",
        "BlockA.FromPortCmd_2",
        "BlockA.FromPortAsync",
        "BlockA.FromInitOneCmd",
        "BlockA.FromInitTwoCmd",
        "SharedBlock.FromPortAsync_Success",
        "BlockA.FromPortAsync_Success"
      ]);
    });
  });

  describe("Nesting", () => {
    const ChildBlock = {
      createModel: () => ({}),
      Logic: {
        name: "ChildBlock",
        config() {
          return { initCommands: this.InitChild };
        },
        port({ destroy, exec, model }) {
          destroy.then(() => (model.deleted = true));
        },
        @Cmd.nope InitChild() {},
        @Cmd.nope ChildDestroy() {}
      }
    };
    const ParentBlock = {
      createModel: () => ({
        arr: [ChildBlock.createModel(), ChildBlock.createModel()],
        child_1: ChildBlock.createModel(),
        child_2: ChildBlock.createModel(),
        child_3: null
      }),
      Logic: {
        name: "ParentBlock",
        children({ nest }) {
          return {
            arr: nest(ChildBlock.Logic),
            child_1: nest(ChildBlock.Logic),
            child_2: nest(ChildBlock.Logic),
            child_3: nest(ChildBlock.Logic)
          };
        },
        @Cmd.update
        AddChild({ model }) {
          return { arr: [...model.arr, ChildBlock.createModel()] };
        },
        @Cmd.update
        RemoveChild({ model }) {
          return { arr: model.arr.slice(1) };
        },
        @Cmd.update
        SetChild({ model }, name, value) {
          return { [name]: value };
        }
      }
    };

    it("should nest logic to array and to non-empty fields", async () => {
      const { app, commands } = await runWithTracking({ app: ParentBlock });
      const cmdNames = commands.map(x => x.name);

      expect(cmdNames).toEqual([
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild"
      ]);
    });

    it("should handle adding new child to array and to field", async () => {
      const { app, commands } = await runWithTracking({ app: ParentBlock });
      await app.proc.exec(ParentBlock.Logic.AddChild);
      await app.proc.exec(
        ParentBlock.Logic.SetChild("child_3", ChildBlock.createModel())
      );

      const cmdNames = commands.map(x => x.name);

      expect(cmdNames).toEqual([
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ParentBlock.AddChild",
        "ChildBlock.InitChild",
        "ParentBlock.SetChild",
        "ChildBlock.InitChild"
      ]);
    });

    it("should handle removing child model from array and field", async () => {
      const { app, commands } = await runWithTracking({ app: ParentBlock });
      const oldArr = app.model.arr;
      const oldChild_2 = app.model.child_2;
      await app.proc.exec(ParentBlock.Logic.RemoveChild);
      await app.proc.exec(ParentBlock.Logic.SetChild("child_2", null));

      const cmdNames = commands.map(x => x.name);

      expect(cmdNames).toEqual([
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ParentBlock.RemoveChild",
        "ParentBlock.SetChild"
      ]);
      expect(oldArr).toHaveLength(2);
      expect(app.model.arr).toHaveLength(1);
      expect(app.model.child_2).toBeNull();
      expect(oldArr[0].deleted).toBeTruthy();
      expect(oldChild_2.deleted).toBeTruthy();
      expect(oldArr[0].__proc).not.toBeDefined();
      expect(oldChild_2.__proc).not.toBeDefined();
    });

    it("should handle removing a whole child array", async () => {
      const { app, commands } = await runWithTracking({ app: ParentBlock });
      const oldArr = app.model.arr;
      await app.proc.exec(ParentBlock.Logic.SetChild("arr", null));

      const cmdNames = commands.map(x => x.name);

      expect(cmdNames).toEqual([
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ChildBlock.InitChild",
        "ParentBlock.SetChild"
      ]);
      expect(oldArr).toHaveLength(2);
      expect(app.model.arr).toBeNull();
      expect(oldArr[0].deleted).toBeTruthy();
      expect(oldArr[1].deleted).toBeTruthy();
    });

    it("should be able to nest itself", async () => {
      let idCounter = 0;
      const RecursiveBlock = {
        createModel: () => ({ recursive: null, a: 0, id: idCounter++ }),
        Logic: {
          name: "AppBlock",
          children({ nest }) {
            return {
              recursive: nest(RecursiveBlock.Logic).handler(this.HandleChange)
            };
          },
          @Cmd.update
          SetField({ model }, name, value) {
            return { [name]: value };
          },
          @Cmd.update
          Increment({ model }, name, value) {
            return { [name]: model[name] + value };
          },
          @Cmd.batch
          HandleChange({ model }, cmd) {
            if (cmd.is(this.Increment.Before, model.recursive)) {
              return this.Increment('a', cmd.args[1]);
            }
          }
        }
      };

      const { app } = await runWithTracking({ app: RecursiveBlock });

      await app.proc.exec(RecursiveBlock.Logic.SetField('recursive',
        RecursiveBlock.createModel()));
      await app.model.recursive.__proc.exec(RecursiveBlock.Logic.SetField('recursive',
        RecursiveBlock.createModel()));
      await app.model.recursive.recursive.__proc.exec(RecursiveBlock.Logic.Increment('a', 2));
      await app.model.recursive.__proc.exec(RecursiveBlock.Logic.Increment('a', 3));
      await app.proc.exec(RecursiveBlock.Logic.Increment('a', 4));

      expect(app.model.a).toEqual(9);
      expect(app.model.recursive.a).toEqual(5);
      expect(app.model.recursive.recursive.a).toEqual(2);
    });
  });

  describe("Computed fields", async () => {
    const SharedBlock = {
      createModel: () => ({ e: 0, f: 4, g: 6 }),
      Logic: {
        name: "SharedBlock",
        computed({ model }) {
          return {
            e: () => model.f + model.g
          };
        },
        @Cmd.update
        SetField(ctx, name, value) {
          return { [name]: value };
        }
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",
        computed({ model, shared }) {
          return {
            c: () => model.a + model.b,
            d: () => model.a + shared.e
          };
        },
        @Cmd.update
        SetField(ctx, name, value) {
          return { [name]: value };
        }
      }
    };

    it("should provide a way to define computed fields of the model", async () => {
      const { app } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.c).toEqual(3);
      expect(app.model.d).toEqual(11);
    });

    it("should reflect changes of model to computed fields", async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.c).toEqual(3);
      expect(app.model.d).toEqual(11);

      await app.proc.exec(AppBlock.Logic.SetField("a", 5));

      expect(app.model.c).toEqual(7);
      expect(app.model.d).toEqual(15);
    });

    it("should reflect changes of shared to computed fields", async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      expect(app.model.d).toEqual(11);

      await shared.proc.exec(SharedBlock.Logic.SetField("f", 6));

      expect(app.model.d).toEqual(13);
    });

    it("should be able to JSON stringify model with computed", async () => {
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
      Logic: {
        name: "SharedBlock",
        computed({ model }) {
          return {
            e: () => model.f + model.g
          };
        },
        @Cmd.update
        SetField(ctx, name, value) {
          return { [name]: value };
        }
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",
        config() {
          return { manualSharedSubscribe: true };
        },
        computed({ model, shared, depends }) {
          return {
            c: depends(shared).compute(() => shared.f + shared.e + model.a),
            d: depends(shared).compute(() => shared.f + shared.g + model.b)
          };
        },
        @Cmd.update
        SetField(ctx, name, value) {
          return { [name]: value };
        }
      }
    };
    const AppParent = {
      createModel: () => ({ a: 1, c: 0, d: 0, child: AppBlock.createModel() }),
      Logic: {
        name: "AppParent",
        children({ nest }) {
          return {
            child: nest(AppBlock.Logic)
          };
        },
        computed({ model, shared, depends }) {
          return {
            c: depends(shared, model.child).compute(() => shared.f + shared.e + model.a + model.child.a),
            d: depends(shared).compute(() => shared.f + shared.g)
          };
        },
        @Cmd.update
        SetField(ctx, name, value) {
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

      await app.proc.exec(AppBlock.Logic.SetField("a", 5));

      expect(app.model.c).toEqual(19);
      expect(app.model.d).toEqual(12);

      await app.proc.exec(SharedBlock.Logic.SetField("f", 5));

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

      await app.proc.exec(AppBlock.Logic.SetField("a", 5).model(app.model.child));

      expect(app.model.c).toEqual(20);
      expect(app.model.d).toEqual(10);
    });
  });

  describe('Singletone blocks', () => {
    const ChildBlock = {
      createModel: () => ({ a: 0 }),
      Logic: {
        name: "ChildBlock",
        @Cmd.update UpdateModel() { return { a: 2 } },
      }
    };
    const SharedBlock = {
      createModel: () => ({
        child: ChildBlock.createModel(),
        a: 0
      }),
      Logic: {
        name: "SharedBlock",
        children({ nest }) {
          return { child: nest(ChildBlock.Logic).singleton() };
        },
        @Cmd.update UpdateModel() { return { a: 1 } },
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 0 }),
      Logic: {
        name: "AppBlock",
      }
    };

    it('should make root of shared to be singleton', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      await app.proc.exec(SharedBlock.Logic.UpdateModel);

      expect(app.model.a).toEqual(0);
      expect(shared.model.a).toEqual(1);
    });

    it('should provied a way to create singleton child block', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      await app.proc.exec(ChildBlock.Logic.UpdateModel);

      expect(app.model.a).toEqual(0);
      expect(shared.model.a).toEqual(0);
      expect(shared.model.child.a).toEqual(2);
    });

    it('should prioritize model binding on command level on same model', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      await shared.proc.exec(SharedBlock.Logic.UpdateModel().model(app.model));

      expect(app.model.a).toEqual(1);
      expect(shared.model.a).toEqual(0);
      expect(shared.model.child.a).toEqual(0);
    });

    it('should prioritize model binding on command level in different model', async () => {
      const { app, shared } = await runWithTracking({
        app: AppBlock,
        shared: SharedBlock
      });

      await shared.proc.exec(ChildBlock.Logic.UpdateModel().model(app.model));

      expect(app.model.a).toEqual(2);
      expect(shared.model.a).toEqual(0);
      expect(shared.model.child.a).toEqual(0);
    });
  });

  describe('Independed runner by rendere', () => {
    const mounter = {
      mount: (a, b) => [a, b]
    };
    const SomeBlock = {
      createModel: () => ({ a: 0 }),
      Logic: {
        name: "ChildBlock",
        config() {
          return { initCommands: this.UpdateModel() };
        },
        @Cmd.update UpdateModel({ model }) {
          return { a: model.a + 2 };
        },
      },
      View: {}
    };
    const AnotherBlock = {
      createModel: () => ({ a: 0 }),
      Logic: {
        name: "AnotherBlock",
        config() {
          return { initCommands: this.UpdateModel() };
        },
        @Cmd.update UpdateModel({ model }) {
          return { a: model.a + 2 };
        },
      },
      View: {}
    };

    it('should run and do not re-reun on re-render', async () => {
      const renderer = Run.createRenderer({ mounter });
      const model = SomeBlock.createModel();
      let res = null

      // First run – should run init
      res = renderer({ model, ...SomeBlock });
      await res.done;
      await model.__proc.exec(SomeBlock.Logic.UpdateModel);
      expect(model.a).toEqual(4);

      // Second run - shouldn't run init
      res = renderer({ model, ...SomeBlock });
      await res.done;
      expect(model.a).toEqual(4);
    });

    it('should be able to run multiple blocks in the same renderer', async () => {
      const renderer = Run.createRenderer({ mounter });
      const modelA = SomeBlock.createModel();
      const modelB = AnotherBlock.createModel();
      let res = null

      // First block
      res = renderer({ model: modelA, ...SomeBlock });
      await res.done;
      await modelA.__proc.exec(SomeBlock.Logic.UpdateModel);
      expect(modelB.a).toEqual(0);
      expect(modelA.a).toEqual(4);

      // Second block
      res = renderer({ model: modelB, ...AnotherBlock });
      await res.done;
      expect(modelB.a).toEqual(2);
      expect(modelA.a).toEqual(4);
    });
  });
});
