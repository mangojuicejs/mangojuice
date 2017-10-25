import { cmd, depends, logicOf } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe('Loigc as a class', () => {
  class AppLogic {
    computed() {
      const { model, shared } = this;
      return {
        c: () => model.a + model.b,
        d: depends(shared).compute(() => model.a + shared.e)
      };
    }
    @cmd SetField(name, value) {
      return { [name]: value };
    }
  }

  it("should support logic defined as a class instance", async () => {
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: AppLogic
    };
    const { app, commands } = await runWithTracking({
      app: AppBlock
    });

    await app.proc.exec(logicOf(app.model).SetField("a", 5));

    expect(app.model.c).toEqual(7);
    expect(commands[0].name).toEqual("AppLogic.SetField");
  });

  it("should support logic defined as a class", async () => {
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: AppLogic
    };
    const { app, commands } = await runWithTracking({
      app: AppBlock
    });

    await app.proc.exec(logicOf(app.model).SetField("a", 5));

    expect(app.model.c).toEqual(7);
    expect(commands[0].name).toEqual("AppLogic.SetField");
  });
});
