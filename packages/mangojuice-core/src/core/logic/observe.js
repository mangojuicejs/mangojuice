import procOf from './procOf';

/**
 * Helper function to handle execution of commands which affects
 * the model. Aimed to be used in mounters to track model updates
 * to re-render the view.
 * @param  {Object} model
 * @param  {Function} handler
 * @param  {Function} destroyHandler
 */
function observe(model, handler, destroyHandler) {
  const modelProc = procOf(model);
  if (!modelProc.observers) return;

  modelProc.observers.push(handler);
  modelProc.destroyPromise.then(destroyHandler);

  return function removeObserver() {
    if (modelProc.observers) {
      modelProc.observers = modelProc.observers.filter(x => x !== handler);
    }
  };
}

export default observe;
