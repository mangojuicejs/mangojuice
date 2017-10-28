/**
 * Helper function to handle execution of commands which affects
 * the model. Aimed to be used inside `port` logic functions or
 * on view mounters.
 * @param  {Object} model
 * @param  {Promise} destroyPromise
 * @param  {Function} handler
 * @param  {Function} destroyHandler
 */
function observe(model, destroyPromise, handler, destroyHandler) {
  const modelProc = procOf(model);
  if (!modelProc.observers) return;

  modelProc.observers.push(event, handler);
  modelProc.destroyPromise.then(destroyHandler);

  if (destroyPromise && destroyPromise.then) {
    const removeObserver = () => {
      if (modelProc.observers) {
        modelProc.observers = modelProc.observers.filter(x => x !== handler);
      }
    }
    destroyPromise.then(removeObserver);
  }
}

export default observe;
