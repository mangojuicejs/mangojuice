import procOf from './procOf';
import { nextId, fastForEach, safeExecFunction } from '../utils';


// Internals
let observersToNotify = {};
let execCounter = 0;


/**
 * Queue run of model observer. The observer
 * will be executed ASAP afther the end of the stack.
 * @private
 * @param  {Process} proc
 * @return {Promise}
 */
function enqueueNotifyObserver(observer) {
  observersToNotify[observer.id] = observer;
}

/**
 * Go through all queued observers and run them. Empty
 * the queue before that.
 * @private
 * @return {Promise}
 */
function notifyQueuedObservers() {
  const list = observersToNotify;
  const obsIds = Object.keys(list);
  observersToNotify = {};
  fastForEach(obsIds, function queuedObserversIterator(obsId) {
    list[obsId]();
  });
}

/**
 * Increase processing counter
 * @private
 */
export function incExecCounter() {
  execCounter += 1;
}

/**
 * Decrease processing counter. When hits zero – run all
 * pending observers
 * @private
 */
export function decExecCounter() {
  execCounter -= 1;
  if (execCounter <= 0) {
    execCounter = 0;
    notifyQueuedObservers();
  }
}

/**
 * A function that adds a handler to the {@link Process} instance attached
 * to a given model, that will be invoked on every command that changed
 * the model. Useful for tracking changes to re-render a view of the model.
 *
 * @example
 * import { run, cmd, observe, logicOf } from 'mangojuice-core';
 *
 * class MyLogic {
 *   \@cmd MultipleUpdates() {
 *     return [
 *       this.UpdateOne,
 *       this.UpdateTwo
 *     ];
 *   }
 *   \@cmd UpdateOne() {
 *     return { one: this.model.one + 1 };
 *   }
 *   \@cmd UpdateTwo() {
 *     return { two: this.model.two + 1 };
 *   }
 * }
 *
 * const res = run({
 *   Logic: MyLogic,
 *   createModel: () => ({ one: 1, two: 1 })
 * });
 *
 * observe(res.model, () => console.log('not-batched'));
 * observe(res.model, () => console.log('batched'), { batched: true });
 *
 * res.proc.exec(logicOf(res.model).MultipleUpdates);
 *
 * // `not-batched` will be printed two times
 * // `batched` will be printed only once
 * @param  {Object} model      A model with attached {@link Process} instance
 * @param  {Function} handler  A function that will be invoked after every command
 *                             that changed the model.
 * @param  {?Object} options   An object with options
 * @param  {bool} options.batched  If true then the handler will be invoked only when
 *                                 the commands stack is empty and model was changed during
 *                                 the stack execution. Useful to reduce amount of not necessary
 *                                 view re-renderings.
 * @return {Function}
 */
export function observe(model, handler, options) {
  const modelProc = procOf(model);
  const type = (options && options.type) || 'observers';
  if (!modelProc[type]) return;

  // Wrap original handler to execute with error logger
  let finalHandler = (arg) => safeExecFunction(modelProc.logger,
    () => handler(arg));

  // Wrap again to execute at the end of the commands stack
  if (options && options.batched) {
    const originalHandler = finalHandler;
    originalHandler.id = nextId();
    finalHandler = function batchedObserver() {
      enqueueNotifyObserver(originalHandler);
    };
  }

  modelProc[type].push(finalHandler);

  return function removeObserver() {
    if (modelProc[type]) {
      modelProc[type] = modelProc[type].filter(x => x !== finalHandler);
    }
  };
}

export default observe;
