import { child, logicOf, procOf, handle, message } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('logicOf', () => {
  it('should get logic attached to the model', async () => {
    class Test {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }

    const { app } = runWithTracking({ app: { Logic: Test } });
    const logic = logicOf(app.model);

    expect(logic instanceof Test).toEqual(true);
  });

  it('should return undefined if logic is not attached to the model', async () => {
    class Test {
      emitMessage() {
        return message(() => ({ hello: 'there' }));
      }
    }

    const { app } = runWithTracking({ app: { Logic: Test } });
    app.proc.destroy();
    const logic = logicOf(app.model);

    expect(logic).toEqual(undefined);
  });
});
