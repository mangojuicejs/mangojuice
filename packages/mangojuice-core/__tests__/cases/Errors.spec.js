import { Cmd, Task, Run, Utils } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";


describe('Errors handling', () => {
  describe('While sync command execution', () => {
    const testError = new Error('Ooops!');
    const AppBlock = {
      createModel: () => ({ a: 1, b: 2, c: 0, d: 0 }),
      Logic: {
        name: "AppBlock",

        @Cmd.update
        SetField(name, value) {
          throw testError;
          return { [name]: value };
        }
      }
    };

    it('shuold notify logger about the error', async () => {
      const { app, errors } = await runWithTracking({ app: AppBlock });

      expect(errors).toHaveLength(0);
      await app.proc.exec(AppBlock.Logic.SetField("a", 12));
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(testError);
    });
  });

  describe('While asynnc command execution (in task)', () => {

  });

  describe('On init stage', () => {

  });
});
