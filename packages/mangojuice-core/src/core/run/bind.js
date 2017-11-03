import Process from '../../classes/Process';


/**
 * Create model, process and bind model to a process.
 * Returns Process instance ready to run.
 * @param  {Object} block
 * @param  {?Object} opts
 * @return {Process}
 */
function bind(block, opts = {}) {
  const ProcessClass = opts.Process || Process;
  const model = block.createModel();
  const proc = new ProcessClass({
    logic: block.Logic,
    logger: opts.logger,
    sharedModel: opts.shared || model,
    configArgs: opts.args || []
  });
  proc.bind(model);
  return { proc, model, block };
}

export default bind;
