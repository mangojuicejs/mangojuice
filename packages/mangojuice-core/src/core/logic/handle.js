import observe from './observe';
import { extend } from '../utils';


/**
 * Add a commands handler to the Process of given model.
 * The handler will be executed for every command after
 * command execution.
 * Returns a "stop" fuction which will stop the handler.
 * @param  {Object} model
 * @param  {Function} handler
 * @param  {Object} options
 * @return {Function}
 */
function handleCmd(type, model, handler) {
  return observe(model, handler, { type });
}

export const handleBefore = handleCmd.bind(null, 'handlersBefore');
export const handleAfter = handleCmd.bind(null, 'handlersAfter');
export const handle = handleAfter;
