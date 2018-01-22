import {
  cmd,
  logicOf,
  depends,
  child,
  task,
  delay,
  procOf
} from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Nesting', () => {
  const ChildBlock = {
    createModel: () => ({}),
    Logic: class ChildBlock {
      config() {
        return { initCommands: this.InitChild };
      }
      port(exec, destroyed) {
        destroyed.then(() => (this.model.deleted = true));
      }
      @cmd
      InitChild() {}
      @cmd
      ChildDestroy() {}
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
      @cmd
      AddChild() {
        return { arr: [...this.model.arr, ChildBlock.createModel()] };
      }
      @cmd
      RemoveChild() {
        return { arr: this.model.arr.slice(1) };
      }
      @cmd
      SetChild(name, value) {
        return { [name]: value };
      }
    }
  };

  it('should nest logic to array and to non-empty fields', async () => {
    const { app, commands } = await runWithTracking({ app: ParentBlock });
    const cmdNames = commands.map(x => x.name);

    expect(cmdNames).toEqual([
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild'
    ]);
  });

  it('should handle adding new child to array and to field', async () => {
    const { app, commands } = await runWithTracking({ app: ParentBlock });
    await app.proc.exec(logicOf(app.model).AddChild);
    await app.proc.exec(
      logicOf(app.model).SetChild('child_3', ChildBlock.createModel())
    );

    const cmdNames = commands.map(x => x.name);

    expect(cmdNames).toEqual([
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ParentBlock.AddChild',
      'ChildBlock.InitChild',
      'ParentBlock.SetChild',
      'ChildBlock.InitChild'
    ]);
  });

  it('should handle removing child model from array and field', async () => {
    const { app, commands } = await runWithTracking({ app: ParentBlock });
    const oldArr = app.model.arr;
    const oldChild_2 = app.model.child_2;
    await app.proc.exec(logicOf(app.model).RemoveChild);
    await app.proc.exec(logicOf(app.model).SetChild('child_2', null));

    const cmdNames = commands.map(x => x.name);

    expect(cmdNames).toEqual([
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ParentBlock.RemoveChild',
      'ParentBlock.SetChild'
    ]);
    expect(oldArr).toHaveLength(2);
    expect(app.model.arr).toHaveLength(1);
    expect(app.model.child_2).toBeNull();
    expect(oldArr[0].deleted).toBeTruthy();
    expect(oldChild_2.deleted).toBeTruthy();
    expect(procOf(oldArr[0], true)).not.toBeDefined();
    expect(procOf(oldChild_2, true)).not.toBeDefined();
  });

  it('should handle removing a whole child array', async () => {
    const { app, commands } = await runWithTracking({ app: ParentBlock });
    const oldArr = app.model.arr;
    await app.proc.exec(logicOf(app.model).SetChild('arr', null));

    const cmdNames = commands.map(x => x.name);

    expect(cmdNames).toEqual([
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitChild',
      'ParentBlock.SetChild'
    ]);
    expect(oldArr).toHaveLength(2);
    expect(app.model.arr).toBeNull();
    expect(oldArr[0].deleted).toBeTruthy();
    expect(oldArr[1].deleted).toBeTruthy();
  });

  it('should be able to nest itself', async () => {
    let idCounter = 0;
    const RecursiveBlock = {
      createModel: () => ({ recursive: null, a: 0, id: idCounter++ }),
      Logic: class AppBlock {
        children() {
          return {
            recursive: child(RecursiveBlock.Logic)
          };
        }
        hubBefore(cmd) {
          if (cmd.is(this.Increment, this.model.recursive)) {
            return this.Increment('a', cmd.args[1]);
          }
        }
        @cmd
        SetField(name, value) {
          return { [name]: value };
        }
        @cmd
        Increment(name, value) {
          return { [name]: this.model[name] + value };
        }
      }
    };

    const { app, commandNames } = await runWithTracking({
      app: RecursiveBlock
    });

    await app.proc.exec(
      logicOf(app.model).SetField('recursive', RecursiveBlock.createModel())
    );
    await procOf(app.model.recursive).exec(
      logicOf(app.model.recursive).SetField(
        'recursive',
        RecursiveBlock.createModel()
      )
    );
    await app.proc.exec(
      logicOf(app.model.recursive.recursive).Increment('a', 2)
    );
    await procOf(app.model.recursive).exec(
      logicOf(app.model.recursive).Increment('a', 3)
    );
    await app.proc.exec(logicOf(app.model).Increment('a', 4));

    expect(commandNames).toEqual([
      'AppBlock.SetField',
      'AppBlock.SetField',
      'AppBlock.Increment',
      'AppBlock.Increment',
      'AppBlock.Increment',
      'AppBlock.Increment',
      'AppBlock.Increment',
      'AppBlock.Increment'
    ]);
    expect(app.model.a).toEqual(9);
    expect(app.model.recursive.a).toEqual(5);
    expect(app.model.recursive.recursive.a).toEqual(2);
  });

  it('should track child initialization on model update', async () => {
    const ChildBlock = {
      createModel: () => ({}),
      Logic: class ChildBlock {
        config() {
          return { initCommands: this.InitChild };
        }
        @cmd
        InitChild() {
          return task(function() { return this.call(delay, 100); })
            .success(this.InitSuccess)
        }
        @cmd
        InitSuccess() {}
      }
    };
    const ParentBlock = {
      createModel: () => ({ child_3: null }),
      Logic: class ParentBlock {
        children() {
          return { child_3: child(ChildBlock.Logic) };
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
    await app.proc.exec(
      logicOf(app.model).SetChild('child_3', ChildBlock.createModel())
    );

    expect(commandNames).toEqual([
      'ParentBlock.SetChild',
      'ChildBlock.InitChild',
      'ChildBlock.InitSuccess'
    ]);
  });

  it('should pass config arguments to children method as well', async () => {
    const handler = jest.fn();
    const ChildBlock = {
      createModel: () => ({}),
      Logic: class ChildBlock {
        children(...args) {
          handler(...args);
        }
      }
    };
    const ParentBlock = {
      createModel: () => ({
        child: ChildBlock.createModel()
      }),
      Logic: class ParentBlock {
        children() {
          return {
            child: child(ChildBlock.Logic, 1, 2, 3)
          };
        }
      }
    };

    const { app, commands } = await runWithTracking({ app: ParentBlock });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toEqual([[1,2,3]]);
  });
});
