import { child, message, logicOf, procOf, task, utils } from 'mangojuice-core';
import { runWithTracking } from 'mangojuice-test';


describe('task', () => {
  it('should call success handler if provided', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
      }
      *testTask() {
        yield utils.delay(50);
        return { hello: 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should use identity success command by default', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
      }
      *testTask() {
        yield utils.delay(50);
        return { hello: 'there!' };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should call fail handler if provided', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .fail(this.failHandler)
      }
      *testTask() {
        yield utils.delay(50);
        throw new Error('ooops');
        return { hello: 'there!' };
      }
      failHandler(...args) {
        return { fail: args };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should emit update event yielded from task', async () => {
    class TestLogic {
      create() {
        return task(this.testTask);
      }
      update = jest.fn();
      *testTask() {
        yield message(() => ({ hey: 'there!' }));
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
    const logic = logicOf(app.model);

    expect(logic.update.mock.calls).toMatchSnapshot();
  });

  it('should emit update event yielded from subtask', async () => {
    class TestLogic {
      create() {
        return task(this.testTask);
      }
      update = jest.fn();
      *testTask() {
        yield this.testSubtask;
      }
      *testSubtask() {
        yield message(() => ({ hey: 'there!' }));
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
    const logic = logicOf(app.model);

    expect(logic.update.mock.calls).toMatchSnapshot();
  });

  it('should cancel a task', async () => {
    const handler = jest.fn();
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
          .fail(this.failHandler)
      }
      cancelTask() {
        return task(this.testTask).cancel();
      }
      *testTask() {
        yield utils.delay(100);
        handler();
        return { hello: 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
      failHandler(...args) {
        return { fail: args };
      }
    }

    const res = runWithTracking({ app: { Logic: TestLogic } });
    const { app, commands } = res;

    app.proc.exec(logicOf(app.model).cancelTask);
    await app.proc.finished();

    expect(handler).toHaveBeenCalledTimes(0);
    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should cancel a task with subtasks', async () => {
    const handler = jest.fn();
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
          .fail(this.failHandler)
      }
      cancelTask() {
        return task(this.testTask).cancel();
      }
      *subSubTask() {
        yield utils.delay(100);
        handler();
      }
      *subTask() {
        yield this.subSubTask();
        handler();
      }
      *testTask() {
        yield this.subTask;
        handler();
        return { hello: 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
      failHandler(...args) {
        return { fail: args };
      }
    }

    const res = runWithTracking({ app: { Logic: TestLogic } });
    const { app, commands } = res;

    app.proc.exec(logicOf(app.model).cancelTask);
    await app.proc.finished();

    expect(handler).toHaveBeenCalledTimes(0);
    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should accept arguments from a task', async () => {
    const handler = jest.fn();
    class TestLogic {
      create() {
        return task(this.testTask)
          .args(42, 'forty-two', [42], { value: 42 }, function () {});
      }
      *testTask(...args) {
        handler(...args);
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(handler.mock.calls).toMatchSnapshot();
  });

  it('should support fast path with non-generator task function', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
      }
      testTask() {
        return { hello: 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should handle error in non-generator task function', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .fail(this.failHandler)
      }
      testTask() {
        throw new Error('ooops');
        return { hello: 'there!' };
      }
      failHandler(...args) {
        return { fail: args };
      }
    }

    const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should cancel prev executing task by default', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .success(this.successHandler)
      }
      *testTask() {
        yield utils.delay(50);
        return { hello: (this.model.hello || '') + 'there!' };
      }
      successHandler(...args) {
        return { success: args };
      }
    }

    const { app, commands } = runWithTracking({ app: { Logic: TestLogic } });
    await utils.delay(40);
    app.proc.exec(logicOf(app.model).create);
    await utils.delay(40);
    app.proc.exec(logicOf(app.model).create);
    await app.proc.finished();

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  it('should NOT cancel prev executing task in multithread mode', async () => {
    class TestLogic {
      create() {
        return task(this.testTask)
          .multithread()
          .success(this.successHandler)
      }
      *testTask() {
        yield utils.delay(50);
        return { hello: (this.model.hello || '') + 'there!' };
      }
      successHandler(result) {
        return result;
      }
    }

    const { app, commands } = runWithTracking({ app: { Logic: TestLogic } });
    await utils.delay(40);
    app.proc.exec(logicOf(app.model).create);
    await utils.delay(40);
    app.proc.exec(logicOf(app.model).create);
    await app.proc.finished();

    expect(app.model).toMatchSnapshot();
    expect(commands).toMatchSnapshot();
  });

  describe('yeilded array', () => {
    it('should aggregate several promises', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const a = utils.delay(10).then(() => 'a');
          const b = utils.delay(20).then(() => 'b');
          const c = utils.delay(30).then(() => 'c');

          const res = yield [a, b, c];
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })

    it('should noop with no args', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const res = yield [];
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })

    it('should support an array of generators', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const res = yield [function*(){ return 1 }()];
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })
  });

  describe('yeilded generator', () => {
    it('should wrap children generators', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *work() {
          yield utils.delay(50);
          return 'yay';
        }
        *testTask(...args) {
          const a = yield this.work;
          const b = yield this.work;
          const c = yield this.work;
          handler(a,b,c);

          const res = yield [this.work, this.work, this.work];
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })
  });

  describe('yeilded invalid', () => {
    it('shuold throw an error', async () => {
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          yield null;
        }
      }

      const { app, errors } = await runWithTracking({
        app: { Logic: TestLogic },
        expectErrors: true
      });

      expect(errors).toMatchSnapshot();
    });
  });

  describe('yeilded object', () => {
    it('should aggregate several promises', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const a = utils.delay(10).then(() => 'a');
          const b = utils.delay(20).then(() => 'b');
          const c = utils.delay(30).then(() => 'c');

          const res = yield {
            a: a,
            b: b,
            c: c
          };
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })

    it('should noop with no args', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const res = yield {};
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })

    it('should ignore non-thunkable properties', async () => {
      const handler = jest.fn();
      function Pet(name) {
        this.name = name;
        this.something = function(){};
      }
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const foo = {
            name: { first: 'tobi' },
            age: 2,
            address: utils.delay(10).then(() => 'aaa'),
            tobi: new Pet('tobi'),
            now: new Date(2017,2,2),
            falsey: false,
            nully: null,
            undefiney: undefined,
          };
          const res = yield foo;
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })

    it('should preserve key order', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *testTask(...args) {
          const before = {
            a: utils.delay(10).then(() => 'a'),
            b: utils.delay(20).then(() => 'b'),
            c: utils.delay(30).then(() => 'c'),
          };

          const after = yield before;
          handler(
            Object.keys(before).join(','),
            Object.keys(after).join(',')
          );
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    });
  });

  describe('yeilded promise', () => {
    function getPromise(val, err) {
      return new Promise(function (resolve, reject) {
        if (err) reject(err);
        else resolve(val);
      });
    }

    describe('with one promise yield', () => {
      it('should work', async () => {
        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            const a = yield getPromise(1);
            handler(a);
          }
        }
        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      })
    });

    describe('with several promise yields', function(){
      it('should work', async () => {
        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            const a = yield getPromise(1);
            const b = yield getPromise(2);
            const c = yield getPromise(3);
            handler(a,b,c);
          }
        }
        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      })
    });

    describe('when a promise is rejected', () => {
      it('should throw and resume', async () => {
        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            let error;
            try {
              yield getPromise(1, new Error('boom'));
            } catch (err) {
              error = err;
            }
            handler(error);
          }
        }

        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      });
    });
  });

  describe('yielded recsive object/array', () => {
    it('should aggregate arrays within arrays', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *work() {
          yield utils.delay(50);
          return 'yay';
        }
        *testTask(...args) {
          const a = utils.delay(10).then(() => 'a');
          const b = utils.delay(20).then(() => 'b');
          const c = utils.delay(30).then(() => 'c');

          const res = yield [a, [b, c]];
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })

    it('should aggregate objects within objects', async () => {
      const handler = jest.fn();
      class TestLogic {
        create() {
          return task(this.testTask);
        }
        *work() {
          yield utils.delay(50);
          return 'yay';
        }
        *testTask(...args) {
          const a = utils.delay(10).then(() => 'a');
          const b = utils.delay(20).then(() => 'b');
          const c = utils.delay(30).then(() => 'c');

          const res = yield {
            0: a,
            1: {
              0: b,
              1: c
            }
          };
          handler(res);
        }
      }
      const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
      expect(handler.mock.calls).toMatchSnapshot();
    })
  });

  describe('yeilded thunk', () => {
    function get(val, err, error) {
      return function(done){
        if (error) throw error;
        setTimeout(function(){
          done(err, val);
        }, 10);
      }
    }

    describe('with one yield', () => {
      it('should work', async () => {
        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            const a = yield get(1);
            handler(a);
          }
        }

        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      })
    })

    describe('with several yields', () => {
      it('should work', async () => {
        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            const a = yield get(1);
            const b = yield get(2);
            const c = yield get(3);
            handler(a,b,c);
          }
        }

        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      })
    })

    describe('with many arguments', () => {
      it('should return an array', async () => {
        function exec(cmd) {
          return function(done){
            done(null, 'stdout', 'stderr');
          }
        }

        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            const out = yield exec('something');
            handler(out);
          }
        }

        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      })
    })

    describe('when the function throws', () => {
      it('should be caught', async () => {
        const handler = jest.fn();
        class TestLogic {
          create() {
            return task(this.testTask);
          }
          *testTask(...args) {
            try {
              var a = yield get(1, null, new Error('boom'));
            } catch (err) {
              handler(err);
            }
          }
        }

        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(handler.mock.calls).toMatchSnapshot();
      })
    })

    describe('when an error is passed then thrown', () => {
      it('should only catch the first error only', async () => {
        class TestLogic {
          create() {
            return task(this.testTask)
              .fail(this.failHandler);
          }
          *testTask(...args) {
            yield function (done){
              done(new Error('first'));
              throw new Error('second');
            }
          }
          failHandler(...args) {
            return { fail: args };
          }
        }

        const { app, commands } = await runWithTracking({ app: { Logic: TestLogic } });
        expect(app.model).toMatchSnapshot();
      })
    });
  });
});
