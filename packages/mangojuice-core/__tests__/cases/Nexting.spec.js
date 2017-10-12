import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


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
