import { cmd, logicOf, depends, child, task, delay } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe("Init commands execution", () => {
  const AsyncTaskDelayed = function() {
    return this.call(delay, 50);
  };
  const SharedBlock = {
    createModel: () => ({}),
    Logic: class SharedBlock {
      config() {
        return { initCommands: [this.FromInitOneCmd()] };
      }
      port({ exec }) {
        exec(this.FromPortAsync);
      }
      @cmd FromPortAsync() {
        return task(AsyncTaskDelayed).success(
          this.FromPortAsync_Success
        );
      }
      @cmd FromInitOneCmd() {}
      @cmd FromPortAsync_Success() {}
    }
  };
  const BlockB = {
    createModel: () => ({}),
    Logic: class BlockB {
      config() {
        return { initCommands: [this.FromInitOneCmd] };
      }
      @cmd FromInitOneCmd() {}
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
          initCommands: [this.FromInitOneCmd, this.FromInitTwoCmd(1, 2, 3)],
        };
      }
      children() {
        return {
          b_1: child(BlockB.Logic),
          b_2: child(BlockB.Logic)
        }
      }
      hub({ exec, cmd }) {
        if (cmd.is('BlockB.FromInitOneCmd', this.model.b_1)) {
          exec(this.HandleB_1);
        } else if (cmd.is('BlockB.FromInitOneCmd', this.model.b_2)) {
          exec(this.HandleB_2);
        } else if (cmd.is('SharedBlock.FromInitOneCmd')) {
          exec(this.FromSubCmd);
        }
      }
      afterHub({ exec, cmd }) {
        if (cmd.is('BlockB.FromInitOneCmd', this.model.b_1)) {
          exec(this.HandleB_11);
        } else if (cmd.is('BlockB.FromInitOneCmd', this.model.b_2)) {
          exec(this.HandleB_22);
        }
      }
      port({ exec, destroy }) {
        exec(this.FromSubCmd)
        exec(this.FromPortCmd)
        exec(this.FromPortAsync())
      }
      @cmd FromPortCmd() {
        return [this.FromPortCmd_1, this.FromPortCmd_2()];
      }
      @cmd FromPortAsync() {
        return task(AsyncTaskDelayed).success(
          this.FromPortAsync_Success
        );
      }
      @cmd FromPortCmd_1() {}
      @cmd FromPortCmd_2() {}
      @cmd FromPortAsync_Success() {}
      @cmd FromInitOneCmd() {}
      @cmd FromInitTwoCmd() {}
      @cmd FromSubCmd() {}
      @cmd HandleB_1() {}
      @cmd HandleB_11() {}
      @cmd HandleB_2() {}
      @cmd HandleB_22() {}
    }
  };

  it("should execute init commands in correct order and finish", async () => {
    const { app, shared, commandNames, errors } = await runWithTracking({
      app: BlockA,
      shared: SharedBlock
    });

    expect(errors).toEqual([]);
    expect(commandNames).toEqual([
      "SharedBlock.FromPortAsync",
      "SharedBlock.FromInitOneCmd",
      "BlockA.FromSubCmd",
      "BlockB.FromInitOneCmd",
      "BlockA.HandleB_1",
      "BlockA.HandleB_11",
      "BlockB.FromInitOneCmd",
      "BlockA.HandleB_2",
      "BlockA.HandleB_22",
      "BlockA.FromSubCmd",
      "BlockA.FromPortCmd",
      "BlockA.FromPortCmd_1",
      "BlockA.FromPortCmd_2",
      "BlockA.FromPortAsync",
      "BlockA.FromInitOneCmd",
      "BlockA.FromInitTwoCmd",
      "SharedBlock.FromPortAsync_Success",
      "BlockA.FromPortAsync_Success"
    ]);
  });
});
