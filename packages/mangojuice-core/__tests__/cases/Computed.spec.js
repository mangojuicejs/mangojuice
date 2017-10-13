import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe("Computed", () => {

  describe("Simple computed", async () => {
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
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",
        computed({ model, shared, depends }) {
          return {
            c: () => model.a + model.b,
            d: depends(shared).compute(() => model.a + shared.e)
          };
        },
        @Cmd.update
        SetField(name, value) {
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
        SetField(name, value) {
          return { [name]: value };
        }
      }
    };
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",
        computed({ model, shared, depends }) {
          return {
            c: depends(shared).compute(() => shared.f + shared.e + model.a),
            d: depends(shared).compute(() => shared.f + shared.g + model.b)
          };
        },
        @Cmd.update
        SetField(name, value) {
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
});
