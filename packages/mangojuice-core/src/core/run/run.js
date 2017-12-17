import bind from './bind';

/**
 * Run given block with opts and return an object with
 * Process instance and promise which will be resolved
 * when all initial tasks of the block will be executed
 * (including all init tasks of children blocks)
 * @param  {Object} block
 * @param  {Object} opts
 * @return {Object}
 */
function run(block, opts = {}) {
  const { proc, model } = bind(block, opts);
  proc.run();
  return {
    proc,
    model,
    block,
    finished: proc.finished()
  };
}

export default run;
