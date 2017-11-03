import { Process, cmd, logicOf, depends, child, task, delay, procOf, run, bind } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


const ChildBlock = {
  createModel: () => ({}),
  Logic: class ChildBlock {
    config() {
      return { initCommands: this.InitChild };
    }
    port(exec, destroyed) {
      destroyed.then(() => this.model.deleted = true);
    }
    @cmd InitChild() {}
    @cmd ChildDestroy() {}
  }
};
const ParentBlock = {
  createModel: () => ({
    arr: [ChildBlock.createModel(), ChildBlock.createModel()],
    child_1: ChildBlock.createModel(),
    child_2: ChildBlock.createModel(),
    child_3: null
  }),
  Logic: class ParentBlock {
    children() {
      return {
        arr: child(ChildBlock.Logic),
        child_1: child(ChildBlock.Logic),
        child_2: child(ChildBlock.Logic),
        child_3: child(ChildBlock.Logic)
      };
    }
    @cmd AddChild() {
      return { arr: [...this.model.arr, ChildBlock.createModel()] };
    }
    @cmd RemoveChild() {
      return { arr: this.model.arr.slice(1) };
    }
    @cmd SetChild(name, value) {
      return { [name]: value };
    }
  }
};

describe('Extend logic and process', () => {
  it('should provide a way to use extended Process implementation', async () => {
    const handler = jest.fn();
    class CustomProcess extends Process {
      bind(...args) {
        handler();
        return super.bind(...args);
      }
      test() {
        handler();
      }
    }

    const res = await run(ParentBlock, { Process: CustomProcess });
    procOf(res.model).test();
    procOf(res.model.child_1).test();
    procOf(res.model.child_2).test();
    procOf(res.model.arr[0]).test();
    procOf(res.model.arr[1]).test();

    expect(handler).toHaveBeenCalledTimes(10);
  });

  it('should provide a way to extend logic class', () => {

  });

  it('should work correcly with "super" commands', () => {

  });
});
