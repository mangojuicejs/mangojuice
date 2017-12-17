import procOf from './procOf';
import { nextId, fastForEach, safeExecFunction } from '../utils';


// Internals
let observersToNotify = {};
let execCounter = 0;

/**
 * Queue run of model observer. The observer
 * will be executed ASAP afther the end of the stack.
 * @param  {Process} proc
 * @return {Promise}
 */
function enqueueNotifyObserver(observer) {
  if (!observer.id) {
    throw new Error('Observer should have an "id"!');
  }
  observersToNotify[observer.id] = observer;
}

/**
 * Go through all queued observers and run them. Empty
 * the queue before that.
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
 */
export function incExecCounter() {
  execCounter += 1;
}

/**
 * Decrease processing counter. When hits zero – run all
 * pending observers
 */
export function decExecCounter() {
  execCounter -= 1;
  if (execCounter <= 0) {
    execCounter = 0;
    notifyQueuedObservers();
  }
}

/**
 * Helper function to handle execution of commands which affects
 * the model. Aimed to be used in mounters to track model updates
 * to re-render the view. Also used in Process for handling changes
 * of computed fields with dependencies.
 * @param  {Object} model
 * @param  {Function} handler
 * @param  {Object} options
 */
export function observe(model, handler, options) {
  const modelProc = procOf(model);
  if (!modelProc.observers) return;

  // Wrap original handler with batch wrapper if needed
  let realHandler = handler;
  if (options && options.batched) {
    const observerWrapper = () =>
      safeExecFunction(modelProc.logger, handler);
    observerWrapper.id = nextId();
    realHandler = function batchedObserver() {
      enqueueNotifyObserver(observerWrapper);
    };
  }

  // Add destroy handler which will be called when process
  // attached to the model will be destroyed (and hence the
  // observer will ber removed and no longer used)
  if (options && options.destroyHandler) {
    modelProc.destroyPromise.then(destroyHandler);
  }

  modelProc.observers.push(realHandler);

  return function removeObserver() {
    if (modelProc.observers) {
      modelProc.observers = modelProc.observers.filter(x => x !== realHandler);
    }
  };
}

export default observe;
