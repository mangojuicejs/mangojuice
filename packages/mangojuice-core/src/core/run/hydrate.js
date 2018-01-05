import run from './run';
import { extend } from '../utils';


/**
 * This function replace a `createModel` function in given block
 * with new function that just returns a given model. It is useful
 * when you have some old model and just want to run everytihing with
 * it (for example for server rendering, or hot module replacement)
 *
 * @example
 * // Hot module replacement example
 * import MyBlock from './MyBlock';
 * import { hydrate, run } from 'mangojuice-core';
 *
 * // Run initial block
 * let res = run(MyBlock);
 *
 * // When block changed destroy the old process, hydrate a new
 * // block with existing model and run hydrated new block again
 * module.hot.accept(['./MyBlock'], () => {
 *   res.proc.destroy();
 *   const newBlock = hydrate(require('./MyBlock'), res.model);
 *   res = run(newBlock);
 * });
 * @param  {Block} block   An original block
 * @param  {Object} model  A model object that you want to use
 * @return {Block}  A new block with replaced `createModel` function
 *                  which just returns a model that you passed as
 *                  second argument.
 */
function hydrate(block, model) {
  const newBlock = {};
  extend(newBlock, block);
  extend(newBlock, { createModel: () => model });
  return newBlock;
}

export default hydrate;
