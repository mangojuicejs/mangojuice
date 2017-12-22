import {
  cmd,
  logicOf,
  depends,
  child,
  task,
  delay,
  utils,
  defineCommand,
  decorateLogic
} from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Without decorators usage', () => {
  function createTestBlocks() {
    const AsyncTaskDelayed = function() {
      return this.call(delay, 50);
    };
    const BlockB = {
      createModel: () => ({}),
      Logic: class BlockB {
        config() {
          return { initCommands: [this.FromInitOneCmd] };
        }
        @cmd
        FromInitOneCmd() {}
        SomeFunction() {
          return 'hello!';
        }
      }
    };
    const BlockA = {
      createModel: () => ({
        b_1: BlockB.createModel(),
        b_2: BlockB.createModel()
      }),
      Logic: class BlockA {
        config() {
          return {
            initCommands: [this.FromInitOneCmd, this.FromInitTwoCmd(1, 2, 3)]
          };
        }
        children() {
          return {
            b_1: child(BlockB.Logic),
            b_2: BlockB.Logic
          };
        }
        hub(cmd) {
          if (cmd.is(logicOf(this.model.b_1).FromInitOneCmd)) {
            return this.HandleB_1;
          } else if (cmd.is(logicOf(this.model.b_2).FromInitOneCmd)) {
            return this.HandleB_2;
          }
        }
        hubAfter(cmd) {
          if (cmd.is(BlockB.Logic.prototype.FromInitOneCmd, this.model.b_1)) {
            return this.HandleB_11;
          } else if (
            cmd.is(BlockB.Logic.prototype.FromInitOneCmd, this.model.b_2)
          ) {
            return this.HandleB_22;
          }
        }
        port(exec, destroyed) {
          exec(this.FromSubCmd);
          exec(this.FromPortCmd);
          exec(this.FromPortAsync());
        }
        FromPortCmd() {
          return [this.FromPortCmd_1, this.FromPortCmd_2()];
        }
        FromPortAsync() {
          return task(AsyncTaskDelayed).success(this.FromPortAsync_Success);
        }
        FromPortCmd_1() {}
        FromPortCmd_2() {}
        FromPortAsync_Success() {}
        FromInitOneCmd() {}
        FromInitTwoCmd() {}
        FromSubCmd() {}
        HandleB_1() {}
        HandleB_11() {}
        HandleB_2() {}
        HandleB_22() {}

        someInternalFunction() {
          return 'andHi!';
        }
      }
    };
    return { BlockA, BlockB };
  }

  it('should decorate all first-letter-uppercase functions in the logic', async () => {
    const { BlockA, BlockB } = createTestBlocks();
    decorateLogic(BlockA.Logic);
    const { app, commandNames } = await runWithTracking({ app: BlockA });

    const funcRes = logicOf(app.model).someInternalFunction();

    expect(funcRes).toEqual('andHi!');

    expect(commandNames).toEqual([
      'BlockB.FromInitOneCmd',
      'BlockA.HandleB_1',
      'BlockA.HandleB_11',
      'BlockB.FromInitOneCmd',
      'BlockA.HandleB_2',
      'BlockA.HandleB_22',
      'BlockA.FromSubCmd',
      'BlockA.FromPortCmd',
      'BlockA.FromPortCmd_1',
      'BlockA.FromPortCmd_2',
      'BlockA.FromPortAsync',
      'BlockA.FromInitOneCmd',
      'BlockA.FromInitTwoCmd',
      'BlockA.FromPortAsync_Success'
    ]);
  });

  it('should decorate all functions with first-letter-uppercase even if decorators is in use', async () => {
    const { BlockA, BlockB } = createTestBlocks();
    decorateLogic(BlockB.Logic);
    const { app, commandNames } = await runWithTracking({ app: BlockB });

    await app.proc.exec(logicOf(app.model).SomeFunction());

    expect(commandNames).toEqual([
      'BlockB.FromInitOneCmd',
      'BlockB.SomeFunction'
    ]);
  });

  it('should decorate all prototyeps in the chain (to support extending logic)', async () => {
    const { BlockA, BlockB } = createTestBlocks();
    class BlockExtOne extends BlockB.Logic {
      ExtOneCommand() {
        return this.ExtTwoCommand();
      }
      ExtTwoCommand() {}
    }
    class BlockExtTwo extends BlockExtOne {
      FromInitOneCmd() {
        return this.ExtOneCommand();
      }
      ExtOneCommand() {
        return super.ExtOneCommand;
      }
    }

    decorateLogic(BlockExtTwo, true);
    const { app, commandNames } = await runWithTracking({
      app: {
        ...BlockB,
        Logic: BlockExtTwo
      }
    });

    expect(commandNames).toEqual([
      'BlockExtTwo.FromInitOneCmd',
      'BlockExtTwo.ExtOneCommand',
      'BlockExtTwo.ExtOneCommand',
      'BlockExtTwo.ExtTwoCommand'
    ]);
  });

  it('shuold support throttle and debounce without decorators', async () => {
    const { BlockA, BlockB } = createTestBlocks();
    class BlockExtOne extends BlockB.Logic {
      FromInitOneCmd() {
        return this.ExtOneCommand();
      }
      // throttle 100
      ExtOneCommand() {}
    }

    defineCommand(BlockExtOne.prototype, 'ExtOneCommand', cmd({ throttle: 100 }));
    decorateLogic(BlockExtOne, true);

    const { app, commandNames } = await runWithTracking({
      app: {
        ...BlockB,
        Logic: BlockExtOne
      }
    });

    expect(commandNames).toEqual([
      'BlockExtOne.FromInitOneCmd',
      'BlockExtOne.ExtOneCommand'
    ]);
  });
});
