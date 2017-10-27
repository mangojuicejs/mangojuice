import handleLogicOf from './handleLogicOf';
import { MODEL_UPDATED_EVENT } from './constants';


/**
 * Helper function to handle execution of commands which affects
 * the model. Aimed to be used inside `port` logic functions.
 * @param  {Object} model
 * @param  {Promise} destroyPromise
 * @param  {Function} handler
 * @param  {Function} destroyHandler
 */
function handleModelOf(model, destroyPromise, handler, destroyHandler) {
  return handleLogicOf(model, destroyPromise, handler, destroyHandler, MODEL_UPDATED_EVENT);
}

export default handleModelOf;
