import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


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
      @Cmd.update UpdateModel() {
        return { a: this.model.a + 2 };
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
      @Cmd.update UpdateModel() {
        return { a: this.model.a + 2 };
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
