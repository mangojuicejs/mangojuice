import run from './run';
import { extend } from '../utils';


/**
 * By given block, model and opts creates a block with given
 * model instead of creating new one. It aimed to use
 * with server rendering when you have fully prepared model
 * and wants to run a block on this model in the browser.
 * @param  {Object} block
 * @param  {Object} model
 * @return {Object}
 */
function hydrate(block, model) {
  const newBlock = {};
  extend(newBlock, block);
  extend(newBlock, { createModel: () => model });
  return newBlock;
}

export default hydrate;
