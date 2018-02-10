import { update, depends, child, task, delay, event, context } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';

describe('Init commands execution', () => {
  const AsyncTaskDelayed = function() {
    return this.call(delay, 50);
  };
  const SharedBlock = {
    Events: {
      UpdateShared: event()
    },
    Logic: class SharedBlockLogic {
      prepare() {
        return this.FromInitOneCmd();
      }
      hub(event) {
        if (event.is(SharedBlock.Events.UpdateShared)) {
          return { SharedUpdated: { ...event } };
        }
      }
      FromPortAsync() {
        return task(AsyncTaskDelayed).success(this.FromPortAsync_Success);
      }
      FromInitOneCmd() {
        return { FromInitOneCmd: true };
      }
      FromPortAsync_Success() {
        return { FromPortAsync_Success: true };
      }
    }
  };
  const BlockB = {
    Events: {
      SomeUpdate: event()
    },
    Logic: class BlockBLogic {
      prepare() {
        return [
          { sharedDump: JSON.stringify(this.shared) },
          this.FromInitOneCmd
        ];
      }
      hub(event) {
        if (event.is(BlockB.Events.SomeUpdate)) {
          return { SomeEventUpdated: { ...event } };
        }
      }
      FromInitOneCmd() {
        return [
          { FromInitOneCmd: true },
          SharedBlock.Events.UpdateShared(3,2,1)
        ];
      }
    }
  };
  const BlockA = {
    Logic: class BlockALogic {
      prepare() {
        return [
          context({
            some: child(SharedBlock.Logic)
          }),
          {
            b_1: child(BlockB.Logic),
            b_2: child(BlockB.Logic)
          },
          this.FromInitOneCmd,
          this.FromInitTwoCmd(1, 2, 3)
        ];
      }
      hub(event, fromChildren) {
        if (event.is(SharedBlock.Events.UpdateShared) && fromChildren) {
          return { ReactOnUpdateShared: { ...event } };
        }
      }
      FromPortCmd() {
        return [ this.FromPortCmd_1, this.FromPortCmd_2() ];
      }
      FromPortAsync() {
        return task(AsyncTaskDelayed)
          .success(this.FromPortAsync_Success);
      }
      FromPortCmd_1() { return { FromPortCmd_1: true }; }
      FromPortCmd_2() { return { FromPortCmd_2: true }; }
      FromPortAsync_Success() { return { FromPortAsync_Success: true } }
      FromInitOneCmd() { return { FromInitOneCmd: true } }
      FromInitTwoCmd() { return { FromInitTwoCmd: true } }
      FromSubCmd() { return [
        { b_1: update(BlockB.Logic, BlockB.Events.SomeUpdate(1,2,3)) },
        { FromSubCmd: true }
      ] }
      HandleB_1() { return { HandleB_1: true } }
      HandleB_11() { return { HandleB_11: true } }
      HandleB_2() { return { HandleB_2: true } }
      HandleB_22() { return { HandleB_22: true } }
    }
  };

  it('should execute init commands in correct order and finish', async () => {
    const { app, commandNames, errors } = await runWithTracking({
      app: BlockA
    });

    expect(errors).toMatchSnapshot();
    expect(app.model).toMatchSnapshot();
    expect(commandNames).toMatchSnapshot();
  });
});
