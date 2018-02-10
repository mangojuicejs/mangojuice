import { update, depends, child, task, delay, msg, context } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('Init commands execution', () => {
  const AsyncTaskDelayed = function() {
    return this.call(delay, 50);
  };
  const TEST_CONTEXT = () => ({
    some: child(SharedBlock.Logic)
  });
  const SharedBlock = {
    Events: {
      UpdateShared: msg(),
      SharedUpdated: msg()
    },
    Logic: class SharedBlockLogic {
      create() {
        return this.FromInitOneCmd();
      }
      update(event) {
        return [
          event.when(SharedBlock.Events.UpdateShared, () => [
            { SharedUpdated: { ...event } },
            SharedBlock.Events.SharedUpdated('a')
          ])
        ];
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
      SomeUpdate: msg()
    },
    Logic: class BlockBLogic {
      create() {
        return [
          context(TEST_CONTEXT).subscribe(),
          context(TEST_CONTEXT).get(ctx => ({
            sharedDump: JSON.stringify(ctx)
          })),
          this.FromInitOneCmd
        ];
      }
      update(event) {
        return [
          event.when(BlockB.Events.SomeUpdate, () => ({
            SomeEventUpdated: { ...event }
          })),
          event.when(SharedBlock.Events.SharedUpdated, () => ({
            ReactOnUpdateShared: { ...event }
          }))
        ];
      }
      FromInitOneCmd() {
        return [
          { FromInitOneCmd: true },
          context(TEST_CONTEXT).update({
            some: child(SharedBlock.Logic).update(SharedBlock.Events.UpdateShared(3,2,1))
          })
        ];
      }
    }
  };
  const BlockA = {
    Logic: class BlockALogic {
      create() {
        return [
          {
            ctx: context(TEST_CONTEXT).create(),
            b_1: child(BlockB.Logic).create(),
            b_2: child(BlockB.Logic).create()
          },
          this.FromInitOneCmd,
          this.FromPortAsync,
          this.FromInitTwoCmd(1, 2, 3)
        ];
      }
      update(event) {
        return [
          event.when(SharedBlock.Events.SharedUpdated, () => ({
            ReactOnUpdateShared: { ...event }
          }))
        ];
      }
      FromPortCmd() {
        return [ this.FromPortCmd_1, this.FromSubCmd, this.FromPortCmd_2() ];
      }
      FromPortAsync() {
        return [
          this.FromPortCmd,
          task(AsyncTaskDelayed).success(this.FromPortAsync_Success)
        ];
      }
      FromPortCmd_1() { return { FromPortCmd_1: true }; }
      FromPortCmd_2() { return { FromPortCmd_2: true }; }
      FromPortAsync_Success() { return { FromPortAsync_Success: true } }
      FromInitOneCmd() { return { FromInitOneCmd: true } }
      FromInitTwoCmd() { return { FromInitTwoCmd: true } }
      FromSubCmd() {
        return [
          { b_1: child(BlockB.Logic).update(BlockB.Events.SomeUpdate(1,2,3)) },
          { FromSubCmd: true }
        ]
      }
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
