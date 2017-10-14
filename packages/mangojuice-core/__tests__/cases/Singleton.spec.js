import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


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
      children() {
        const { nest } = this;
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
