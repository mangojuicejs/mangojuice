import Message from './Message';
import { sym, is, fastTry, ensureError, extend, noop, CANCEL, identity } from '../core/utils';


/**
 * Main task executor class, which set as a context for a
 * task function. Provides a way to execute a task, cancel
 * the task and wait for all subtasks to be finished.
 *
 * @private
 * @class AsyncTask
 * @param {Object|AsyncTask}   parent
 * @param {Function}          fn
 * @param {Array<any>}        args
 */
function AsyncTask(proc, taskObj) {
  this.proc = proc;
  this.taskObj = taskObj;
  this.execution = null;
}

extend(AsyncTask.prototype, /** @lends AsyncTask.prototype */{
  /**
   * Execute a task and handle the response. Returns
   * an array which will be executed when the task and all
   * subtasks finished
   * @return {Promise}
   */
  exec() {
    if (this.execution) {
      return this.execution;
    }

    const { task, customArgs } = this.taskObj;
    const tryResult = fastTry(() => task.apply(this.proc.logic, customArgs));

    if (tryResult.error) {
      this.handleFail(tryResult.error);
      return Promise.resolve();
    } else if (!is.generator(tryResult.result)) {
      this.handleSuccess(tryResult.result);
      return Promise.resolve();
    } else {
      this.execution = this.iterate(tryResult.result)
        .then(this.handleSuccess.bind(this), this.handleFail.bind(this));
      return this.execution;
    }
  },

  /**
   * Cancel this task and all children subtasks
   */
  cancel() {
    this.execution = null;
    this.cancelled = true;
    if (this.defer) {
      this.defer.resolve();
    }
  },

  execCommand(cmdFn, arg) {
    if (this.cancelled) return;
    this.proc.exec(() => cmdFn && cmdFn.call(this.proc.logic, arg));
  },

  handleSuccess(result) {
    const { successCmd } = this.taskObj;
    const actualSuccessCmd = successCmd || identity;
    this.execCommand(actualSuccessCmd, result);
  },

  handleFail(error) {
    const { failCmd } = this.taskObj;
    if (failCmd) {
      this.execCommand(failCmd, error);
    } else {
      this.proc.logger.onCatchError(error, this.proc, this.taskObj);
    }
  },

  iterate(gen) {
    return new Promise((resolve, reject) => {
      if (!this.defer) {
        this.defer = { resolve, reject };
      }
      if (is.func(gen)) {
        const tryResult = fastTry(() => gen.apply(this));
        if (tryResult.error) return reject(tryResult.error);
        gen = tryResult.result;
      }
      if (!gen || !is.generator(gen)) {
        return resolve(gen);
      }

      const onFulfilled = (res) => {
        if (this.cancelled) return;
        const { error, result } = fastTry(() => gen.next(res));
        if (error) return reject(error);
        next(result);
        return null;
      };

      const onRejected = (err) => {
        if (this.cancelled) return;
        const { error, result } = fastTry(() => gen.throw(err));
        if (error) return reject(error);
        next(result);
      };

      const next = (ret) => {
        if (this.cancelled) return;
        if (ret.done) return resolve(ret.value);
        var value = this.toPromise(ret.value);
        if (value && is.promise(value)) return value.then(onFulfilled, onRejected);
        return onRejected(new TypeError('You may only yield a function, promise, generator, array, object or message '
          + 'but the following object was passed: "' + String(ret.value) + '"'));
      };

      onFulfilled();
    });
  },

  toPromise(obj) {
    if (!obj) return obj;
    if (is.promise(obj)) return obj;
    if (is.generatorFunc(obj) || is.generator(obj)) return this.iterate(obj);
    if (is.func(obj)) return this.thunkToPromise(obj);
    if (is.array(obj)) return this.arrayToPromise(obj);
    if (obj instanceof Message) return this.emitUpdateMessage(obj);
    if (obj.constructor === Object) return this.objectToPromise(obj);
    return obj;
  },

  emitUpdateMessage(msg) {
    this.proc.update(msg);
    return Promise.resolve();
  },

  thunkToPromise(fn) {
    return new Promise((resolve, reject) => {
      fn.call(this.proc.logic, (err, res) => {
        if (err) return reject(err);
        if (arguments.length > 2) res = slice.call(arguments, 1);
        resolve(res);
      });
    });
  },

  arrayToPromise(obj) {
    return Promise.all(obj.map(this.toPromise, this));
  },

  objectToPromise(obj) {
    const results = new obj.constructor();
    const keys = Object.keys(obj);
    const promises = [];

    const defer = (promise, key) => {
      results[key] = undefined;
      promises.push(promise.then((res) => {
        results[key] = res;
      }));
    };

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const promise = this.toPromise(obj[key]);
      if (promise && is.promise(promise)) {
        defer(promise, key);
      } else {
        results[key] = obj[key];
      }
    }
    return Promise.all(promises).then(() => results);
  }
});

export default AsyncTask;
