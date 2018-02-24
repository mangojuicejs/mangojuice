import { child, procOf, handle, message, Process } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('procOf', () => {
  it('should return process of the model', async () => {
    class Test {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }

    const { app } = runWithTracking({ app: { Logic: Test } });
    const proc = procOf(app.model);

    expect(proc instanceof Process).toEqual(true);
    expect(proc).toEqual(app.proc);
  });

  it('should return undefined if proc is not attached to the model', async () => {
    const someObj = {};
    const proc = procOf(someObj);

    expect(proc).toEqual(undefined);
  });
});
