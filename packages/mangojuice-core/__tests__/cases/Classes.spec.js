import { Cmd, Task, Run, Utils, LogicBase } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe('Loigc as a class', () => {
  class AppLogic extends LogicBase {
    computed() {
      const { model, shared, depends } = this;
      return {
        c: () => model.a + model.b,
        d: depends(shared).compute(() => model.a + shared.e)
      };
    }

    @Cmd.update
    SetField(name, value) {
      return { [name]: value };
    }
  }

  it("should support logic defined as a class instance", async () => {
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: new AppLogic()
    };
    const { app, commands } = await runWithTracking({
      app: AppBlock
    });

    await app.proc.exec(AppBlock.Logic.SetField("a", 5));

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

    await app.proc.exec(app.proc.logic.SetField("a", 5));

    expect(app.model.c).toEqual(7);
    expect(commands[0].name).toEqual("AppLogic.SetField");
  });
});
