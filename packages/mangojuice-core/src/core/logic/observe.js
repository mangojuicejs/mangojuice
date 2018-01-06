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
