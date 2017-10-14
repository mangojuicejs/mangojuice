import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe("Init commands execution", () => {
  const AsyncTaskDelayed = function() {
    return this.call(Task.delay, 50);
  };
  const SharedBlock = {
    createModel: () => ({}),
    Logic: {
      name: "SharedBlock",
      config() {
        return { initCommands: [this.FromInitOneCmd()] };
      },
      port() {
        return this.exec(this.FromPortAsync);
      },
      @Cmd.execLatest
      FromPortAsync() {
        return Task.create(AsyncTaskDelayed).success(
          this.FromPortAsync_Success
        );
      },
      @Cmd.nope FromInitOneCmd() {},
      @Cmd.nope FromPortAsync_Success() {}
    }
  };
  const BlockB = {
    createModel: () => ({}),
    Logic: {
      name: "BlockB",
      config() {
        return { initCommands: [this.FromInitOneCmd] };
      },
      @Cmd.nope FromInitOneCmd() {}
    }
  };
  const BlockA = {
    createModel: () => ({
      b_1: BlockB.createModel(),
      b_2: BlockB.createModel()
    }),
    Logic: {
      name: "BlockA",
      config() {
        return {
          initCommands: [this.FromInitOneCmd, this.FromInitTwoCmd(1, 2, 3)],
        };
      },
      children() {
        return {
          b_1: this.nest(BlockB.Logic).handler(this.HandleB_1),
          b_2: this.nest(BlockB.Logic).handler(this.HandleB_2)
        }
      },
      port() {
        const { model, shared, destroy, exec } = this;
        Utils.handleModelChanges(shared, cmd => {
          exec(this.FromSubCmd);
        }, destroy);

        return Promise.all([
          exec(this.FromSubCmd),
          exec(this.FromPortCmd),
          exec(this.FromPortAsync())
        ]);
      },
      @Cmd.batch
      FromPortCmd() {
        return [this.FromPortCmd_1, this.FromPortCmd_2()];
      },
      @Cmd.execLatest
      FromPortAsync() {
        return Task.create(AsyncTaskDelayed).success(
          this.FromPortAsync_Success
        );
      },
      @Cmd.batch FromPortCmd_1() {},
      @Cmd.batch FromPortCmd_2() {},
      @Cmd.nope FromPortAsync_Success() {},
      @Cmd.nope FromInitOneCmd() {},
      @Cmd.nope FromInitTwoCmd() {},
      @Cmd.nope FromSubCmd() {},
      @Cmd.nope HandleB_1() {},
      @Cmd.nope HandleB_2() {}
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
      "BlockB.FromInitOneCmd",
      "BlockA.HandleB_1",
      "BlockA.HandleB_1",
      "BlockB.FromInitOneCmd",
      "BlockA.HandleB_2",
      "BlockA.HandleB_2",
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
