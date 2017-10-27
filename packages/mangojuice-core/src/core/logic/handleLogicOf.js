import procOf from './procOf';
import { CMD_EXEC_EVENT, DESTROY_MODEL_EVENT } from './constants';


/**
 * Helper function to handle execution of any command on the
 * given model. Aimed to be used inside `port` logic functions.
 * @param  {Object} model
 * @param  {Promise} destroyPromise
 * @param  {Function} handler
 * @param  {Function} destroyHandler
 */
function handleLogicOf(model, destroyPromise, handler, destroyHandler, event) {
  const modelProc = procOf(model);
  const listenEvent = event || CMD_EXEC_EVENT;

  modelProc.addListener(listenEvent, handler);
  modelProc.addListener(DESTROY_MODEL_EVENT, destroyHandler);

  if (destroyPromise && destroyPromise.then) {
    const removeLogicHandler = () => {
      modelProc.removeListener(listenEvent, handler)
      modelProc.removeListener(DESTROY_MODEL_EVENT, destroyHandler);
    };
    destroyPromise.then(removeLogicHandler);
  }
}

export default handleLogicOf;
