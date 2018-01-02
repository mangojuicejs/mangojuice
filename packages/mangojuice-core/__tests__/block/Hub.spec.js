import { cmd, logicOf, depends, child, handleAfter, handleBefore } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Hub in logic', () => {
  it('should call hub before every command from children blocks', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({
        child: BlockB.createModel()
      }),
      Logic: class BlockA {
        hubBefore(cmd) {
          handler(cmd, 'a');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: BlockB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const BlockB = {
      createModel: () => ({
        child: BlockC.createModel()
      }),
      Logic: class BlockB {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdB;
        }
        children() {
          return {
            child: BlockC.Logic
          };
        }
        @cmd
        SomeCmdB() {}
      }
    };
    const BlockC = {
      createModel: () => ({}),
      Logic: class BlockC {
        hubBefore(cmd) {
          handler(cmd, 'c');
        }
        @cmd
        SomeCmdC() {}
      }
    };

    const { app, execOrder } = await runWithTracking({ app: BlockA });
    await app.proc.exec(logicOf(app.model.child.child).SomeCmdC);
    await app.proc.exec(logicOf(app.model.child).SomeCmdB);
    await app.proc.exec(logicOf(app.model).SomeCmdA);

    expect(handler).toHaveBeenCalledTimes(4);
    expect(execOrder).toEqual([
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA',
      'BlockC.SomeCmdC',
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA'
    ]);
  });

  it('should call hubBefore before every command from children blocks', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({
        child: BlockB.createModel()
      }),
      Logic: class BlockA {
        hubBefore(cmd) {
          handler(cmd, 'a');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: BlockB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const BlockB = {
      createModel: () => ({
        child: BlockC.createModel()
      }),
      Logic: class BlockB {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdB;
        }
        children() {
          return {
            child: BlockC.Logic
          };
        }
        @cmd
        SomeCmdB() {}
      }
    };
    const BlockC = {
      createModel: () => ({}),
      Logic: class BlockC {
        hubBefore(cmd) {
          handler(cmd, 'c');
        }
        @cmd
        SomeCmdC() {}
      }
    };

    const { app, execOrder } = await runWithTracking({ app: BlockA });
    await app.proc.exec(logicOf(app.model.child.child).SomeCmdC);
    await app.proc.exec(logicOf(app.model.child).SomeCmdB);
    await app.proc.exec(logicOf(app.model).SomeCmdA);

    expect(handler).toHaveBeenCalledTimes(4);
    expect(execOrder).toEqual([
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA',
      'BlockC.SomeCmdC',
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA'
    ]);
  });

  it('should call hubAfter after every command from children blocks', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({
        child: BlockB.createModel()
      }),
      Logic: class BlockA {
        hubAfter(cmd) {
          handler(cmd, 'a');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: BlockB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const BlockB = {
      createModel: () => ({
        child: BlockC.createModel()
      }),
      Logic: class BlockB {
        hubAfter(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdB;
        }
        children() {
          return {
            child: BlockC.Logic
          };
        }
        @cmd
        SomeCmdB() {}
      }
    };
    const BlockC = {
      createModel: () => ({}),
      Logic: class BlockC {
        hubAfter(cmd) {
          handler(cmd, 'c');
        }
        @cmd
        SomeCmdC() {}
      }
    };

    const { app, execOrder } = await runWithTracking({ app: BlockA });
    await app.proc.exec(logicOf(app.model.child.child).SomeCmdC);
    await app.proc.exec(logicOf(app.model.child).SomeCmdB);
    await app.proc.exec(logicOf(app.model).SomeCmdA);

    expect(handler).toHaveBeenCalledTimes(4);
    expect(execOrder).toEqual([
      'BlockC.SomeCmdC',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA',
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA',
      'BlockA.SomeCmdA'
    ]);
  });

  it('should NOT call hubBefore before every command from shared block', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({
        child: BlockB.createModel()
      }),
      Logic: class BlockA {
        hubBefore(cmd) {
          handler(cmd, 'a');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: BlockB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const BlockB = {
      createModel: () => ({
        child: BlockC.createModel()
      }),
      Logic: class BlockB {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdB;
        }
        children() {
          return {
            child: BlockC.Logic
          };
        }
        @cmd
        SomeCmdB() {}
      }
    };
    const BlockC = {
      createModel: () => ({}),
      Logic: class BlockC {
        hubBefore(cmd) {
          handler(cmd, 'c');
          return this.SomeCmdC;
        }
        @cmd
        SomeCmdC() {}
      }
    };
    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: SharedB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        hubBefore(cmd) {
          handler(cmd, 'c');
          return this.SomeCmdB;
        }
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, shared, execOrder } = await runWithTracking({
      app: BlockA,
      shared: SharedA
    });
    await app.proc.exec(logicOf(app.model.child.child).SomeCmdC);
    await shared.proc.exec(logicOf(shared.model).SomeCmdA);
    await shared.proc.exec(logicOf(shared.model.child).SomeCmdB);

    expect(handler).toHaveBeenCalledTimes(4);
    expect(execOrder).toEqual([
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA',
      'BlockC.SomeCmdC',
      'SharedA.SomeCmdA',
      'SharedA.SomeCmdA',
      'SharedB.SomeCmdB'
    ]);
  });

  it('should NOT call hubAfter after every command from shared block', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({
        child: BlockB.createModel()
      }),
      Logic: class BlockA {
        hubBefore(cmd) {
          handler(cmd, 'a');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: BlockB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const BlockB = {
      createModel: () => ({
        child: BlockC.createModel()
      }),
      Logic: class BlockB {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdB;
        }
        children() {
          return {
            child: BlockC.Logic
          };
        }
        @cmd
        SomeCmdB() {}
      }
    };
    const BlockC = {
      createModel: () => ({}),
      Logic: class BlockC {
        hubBefore(cmd) {
          handler(cmd, 'c');
          return this.SomeCmdC;
        }
        @cmd
        SomeCmdC() {}
      }
    };
    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: SharedB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        hubAfter(cmd) {
          handler(cmd, 'c');
          return this.SomeCmdB;
        }
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, shared, execOrder } = await runWithTracking({
      app: BlockA,
      shared: SharedA
    });
    await app.proc.exec(logicOf(app.model.child.child).SomeCmdC);
    await shared.proc.exec(logicOf(shared.model).SomeCmdA);
    await shared.proc.exec(logicOf(shared.model.child).SomeCmdB);

    expect(handler).toHaveBeenCalledTimes(4);
    expect(execOrder).toEqual([
      'BlockA.SomeCmdA',
      'BlockB.SomeCmdB',
      'BlockA.SomeCmdA',
      'BlockC.SomeCmdC',
      'SharedA.SomeCmdA',
      'SharedA.SomeCmdA',
      'SharedB.SomeCmdB'
    ]);
  });

  it('should NOT call hubBefore inside shared blocks tree for shared commands', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({}),
      Logic: class BlockA {}
    };
    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        hubBefore(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: SharedB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        hubBefore(cmd) {
          handler(cmd, 'c');
          return this.SomeCmdB;
        }
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, shared, execOrder } = await runWithTracking({
      app: BlockA,
      shared: SharedA
    });
    await shared.proc.exec(logicOf(shared.model).SomeCmdA);
    await shared.proc.exec(logicOf(shared.model.child).SomeCmdB);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(execOrder).toEqual([
      'SharedA.SomeCmdA',
      'SharedA.SomeCmdA',
      'SharedB.SomeCmdB'
    ]);
  });

  it('should NOT call hubAfter inside shared blocks tree for shared commands', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({}),
      Logic: class BlockA {}
    };
    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        hubAfter(cmd) {
          handler(cmd, 'b');
          return this.SomeCmdA;
        }
        children() {
          return {
            child: SharedB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        hubAfter(cmd) {
          handler(cmd, 'c');
          return this.SomeCmdB;
        }
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, shared, execOrder } = await runWithTracking({
      app: BlockA,
      shared: SharedA
    });
    await shared.proc.exec(logicOf(shared.model).SomeCmdA);
    await shared.proc.exec(logicOf(shared.model.child).SomeCmdB);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(execOrder).toEqual([
      'SharedA.SomeCmdA',
      'SharedB.SomeCmdB',
      'SharedA.SomeCmdA'
    ]);
  });

  it('should catch all commands by command from prototype', async () => {
    const handler = jest.fn();
    const BlockA = {
      createModel: () => ({
        child_1: BlockB.createModel(),
        child_2: BlockB.createModel(),
      }),
      Logic: class BlockA {
        hubBefore(cmd) {
          if (cmd.is(BlockB.Logic.prototype.SomeCmdB)) {
            handler(cmd, 'a');
          }
        }
        children() {
          return {
            child_1: BlockB.Logic,
            child_2: BlockB.Logic
          };
        }
      }
    };
    const BlockB = {
      createModel: () => ({}),
      Logic: class BlockB {
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, execOrder } = await runWithTracking({ app: BlockA });
    await app.proc.exec(logicOf(app.model.child_1).SomeCmdB);
    await app.proc.exec(logicOf(app.model.child_2).SomeCmdB);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should provide a way to handle after commands of some model externally', async () => {
    const handlerB = jest.fn();
    const handlerA = jest.fn();

    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        children() {
          return {
            child: SharedB.Logic
          };
        }
        hubAfter() {
          handlerB(true)
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, } = await runWithTracking({ app: SharedA });

    handleAfter(app.model.child, handlerB);
    handleAfter(app.model, handlerA);
    const testCmd = logicOf(app.model.child).SomeCmdB();
    await app.proc.exec(testCmd);

    expect(handlerA.mock.calls).toEqual([]);
    expect(handlerB.mock.calls[0][0]).toEqual(true);
    expect(handlerB.mock.calls[1][0]).toEqual(testCmd);
  });

  it('should provide a way to handle before commands of some model externally', async () => {
    const handlerB = jest.fn();
    const handlerA = jest.fn();

    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        children() {
          return {
            child: SharedB.Logic
          };
        }
        hubAfter() {
          handlerB(true)
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, } = await runWithTracking({ app: SharedA });

    handleBefore(app.model.child, handlerB);
    handleBefore(app.model, handlerA);
    const testCmd = logicOf(app.model.child).SomeCmdB();
    await app.proc.exec(testCmd);

    expect(handlerA.mock.calls).toEqual([]);
    expect(handlerB.mock.calls[1][0]).toEqual(true);
    expect(handlerB.mock.calls[0][0]).toEqual(testCmd);
  });

  it('should stop handling commands when call returned stopper', async () => {
    const handlerB = jest.fn();
    const handlerA = jest.fn();

    const SharedA = {
      createModel: () => ({
        child: SharedB.createModel()
      }),
      Logic: class SharedA {
        children() {
          return {
            child: SharedB.Logic
          };
        }
        @cmd
        SomeCmdA() {}
      }
    };
    const SharedB = {
      createModel: () => ({}),
      Logic: class SharedB {
        @cmd
        SomeCmdB() {}
      }
    };

    const { app, } = await runWithTracking({ app: SharedA });

    handleBefore(app.model.child, handlerB)();
    handleBefore(app.model, handlerA)();
    const testCmd = logicOf(app.model.child).SomeCmdB();
    await app.proc.exec(testCmd);

    expect(handlerA.mock.calls).toEqual([]);
    expect(handlerB.mock.calls).toEqual([]);
  });
});
